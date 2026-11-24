package org.variantscope;

import java.io.*;
import java.nio.charset.*;
import java.nio.file.*;
import java.security.*;
import java.util.*;
import org.springframework.jdbc.support.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DatasetService {
  final java.util.concurrent.Semaphore importLock = new java.util.concurrent.Semaphore(1);
  final VariantRepository repo;

  public DatasetService(VariantRepository r) {
    repo = r;
  }

  public Map<String, Object> get(long id) {
    var rows = repo.jdbc().queryForList("SELECT * FROM datasets WHERE id=?", id);
    if (rows.isEmpty()) throw new NoSuchElementException("数据集不存在");
    return rows.get(0);
  }

  public Map<String, Object> upload(MultipartFile file, String name, String reference)
      throws Exception {
    if (file.isEmpty() || file.getSize() > 100L * 1024 * 1024)
      throw new IllegalArgumentException("文件为空或超过 100 MB");
    if (name == null || name.isBlank() || name.length() > 200)
      throw new IllegalArgumentException("数据集名称须为 1–200 字符");
    if (reference != null && reference.length() > 500) throw new IllegalArgumentException("参考版本过长");
    Path temp = Files.createTempFile("variantscope-", ".vcf");
    if (!importLock.tryAcquire()) {
      Files.deleteIfExists(temp);
      throw new IllegalStateException("已有导入任务运行，请稍后重试");
    }
    try {
      file.transferTo(temp);
      String sha;
      try (InputStream in = Files.newInputStream(temp)) {
        var digest = MessageDigest.getInstance("SHA-256");
        byte[] buf = new byte[65536];
        int n;
        while ((n = in.read(buf)) != -1) digest.update(buf, 0, n);
        sha = HexFormat.of().formatHex(digest.digest());
      }
      if (!repo.jdbc().queryForList("SELECT id FROM datasets WHERE sha=?", sha).isEmpty())
        throw new IllegalStateException("相同文件已经导入，请查看或重新分析原数据集");
      KeyHolder keys = new GeneratedKeyHolder();
      repo.jdbc()
          .update(
              c -> {
                var p =
                    c.prepareStatement(
                        "INSERT INTO datasets(name,sha,status,reference_name)"
                            + " VALUES(?,?,'IMPORTING',?)",
                        new String[] {"id"});
                p.setString(1, name);
                p.setString(2, sha);
                p.setString(3, reference == null || reference.isBlank() ? null : reference);
                return p;
              },
              keys);
      long id = keys.getKey().longValue();
      long lineNo = 0, count = 0;
      try (BufferedReader in =
          new BufferedReader(
              new InputStreamReader(
                  Files.newInputStream(temp),
                  StandardCharsets.UTF_8
                      .newDecoder()
                      .onMalformedInput(CodingErrorAction.REPORT)))) {
        String line;
        int cols = 0;
        boolean version = false, header = false;
        StringBuilder metadata = new StringBuilder();
        List<VcfParser.Variant> batch = new ArrayList<>();
        List<Long> lines = new ArrayList<>();
        while (true) {
          lineNo++;
          line = boundedLine(in);
          if (line == null) {
            lineNo--;
            break;
          }
          if (lineNo == 1) {
            if (!line.matches("##fileformat=VCFv4\\.[0-9]+"))
              throw new IllegalArgumentException("首行必须为 VCF 4.x fileformat");
            version = true;
          }
          if (line.startsWith("##")) {
            if (header) throw new IllegalArgumentException("记录区内出现元数据");
            if (metadata.length() + line.length() > 1048576)
              throw new IllegalArgumentException("元数据超过 1 MB");
            metadata.append(line).append('\n');
            if (line.startsWith("##reference=") && (reference == null || reference.isBlank()))
              repo.jdbc()
                  .update(
                      "UPDATE datasets SET reference_name=? WHERE id=?", line.substring(12), id);
            continue;
          }
          if (line.startsWith("#CHROM")) {
            if (header) throw new IllegalArgumentException("重复表头");
            String[] h = line.split("\t", -1);
            if (h.length != 8 && h.length != 10)
              throw new IllegalArgumentException("V1 仅接受无样本或单样本 VCF（8 或 10 列）");
            if (!String.join("\t", Arrays.copyOf(h, 8))
                    .equals("#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO")
                || (h.length == 10 && (!h[8].equals("FORMAT") || h[9].isBlank())))
              throw new IllegalArgumentException("VCF 表头错误");
            cols = h.length;
            header = true;
            repo.jdbc()
                .update(
                    "UPDATE datasets SET samples=?,metadata=? WHERE id=?",
                    h.length == 10 ? h[9] : "",
                    metadata.toString(),
                    id);
            continue;
          }
          if (!version || !header) throw new IllegalArgumentException("缺少 #CHROM 表头");
          if (line.isBlank()) throw new IllegalArgumentException("记录区存在空行");
          batch.add(VcfParser.parse(line, cols));
          lines.add(lineNo);
          count++;
          if (count > 1000000) throw new IllegalArgumentException("超过一百万条记录上限");
          if (batch.size() == 500) {
            repo.insert(id, batch, lines);
            batch.clear();
            lines.clear();
            repo.jdbc().update("UPDATE datasets SET record_count=? WHERE id=?", count, id);
          }
        }
        if (!header) throw new IllegalArgumentException("缺少表头");
        if (!batch.isEmpty()) repo.insert(id, batch, lines);
        repo.jdbc()
            .update("UPDATE datasets SET status='READY',record_count=? WHERE id=?", count, id);
      } catch (Exception e) {
        repo.jdbc().update("DELETE FROM variants WHERE dataset_id=?", id);
        repo.jdbc()
            .update(
                "UPDATE datasets SET status='FAILED',record_count=0,error=? WHERE id=?",
                "第 " + lineNo + " 行：" + e.getMessage(),
                id);
      }
      return get(id);
    } finally {
      importLock.release();
      Files.deleteIfExists(temp);
    }
  }

  static String boundedLine(Reader r) throws IOException {
    StringBuilder b = new StringBuilder();
    int c;
    while ((c = r.read()) != -1) {
      if (c == '\n') break;
      if (b.length() >= 65536) throw new IllegalArgumentException("单行超过 64 KiB");
      b.append((char) c);
    }
    if (c == -1 && b.isEmpty()) return null;
    if (!b.isEmpty() && b.charAt(b.length() - 1) == '\r') b.setLength(b.length() - 1);
    return b.toString();
  }
}
