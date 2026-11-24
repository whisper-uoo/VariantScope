package org.variantscope;

import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api")
public class ApiController {
  final DatasetService d;
  final VariantRepository r;
  final StatisticsService stats;

  public ApiController(DatasetService d, VariantRepository r, StatisticsService s) {
    this.d = d;
    this.r = r;
    stats = s;
  }

  @GetMapping("/datasets")
  public Object datasets() {
    return r.jdbc()
        .queryForList(
            "SELECT id,name,sha,created,reference_name,samples,status,record_count,error FROM"
                + " datasets ORDER BY id DESC LIMIT 200");
  }

  @PostMapping("/datasets")
  public Object upload(
      @RequestParam MultipartFile file,
      @RequestParam String name,
      @RequestParam(required = false) String reference)
      throws Exception {
    return d.upload(file, name, reference);
  }

  @GetMapping("/datasets/{id}")
  public Object dataset(@PathVariable long id) {
    return d.get(id);
  }

  @DeleteMapping("/datasets/{id}")
  public void delete(@PathVariable long id) {
    if (d.get(id).get("status").equals("IMPORTING")) throw new IllegalStateException("导入中不能删除");
    r.jdbc().update("DELETE FROM datasets WHERE id=?", id);
  }

  @PostMapping("/datasets/{id}/reanalyze")
  public Object reanalyze(@PathVariable long id) {
    d.get(id);
    return stats.calculate(id, Map.of());
  }

  @GetMapping("/datasets/{id}/stats")
  public Object stats(@PathVariable long id, @RequestParam Map<String, String> p) {
    d.get(id);
    return stats.calculate(id, p);
  }

  @GetMapping("/datasets/{id}/variants")
  public Object variants(@PathVariable long id, @RequestParam Map<String, String> p) {
    d.get(id);
    var q = r.query(id, p);
    int page = integer(p.getOrDefault("page", "0")), size = integer(p.getOrDefault("size", "25"));
    if (page < 0 || page > 100000 || size < 1 || size > 200)
      throw new IllegalArgumentException("分页范围非法");
    String sort =
        Map.of("pos", "pos", "qual", "qual", "chrom", "chrom", "id", "id")
            .get(p.getOrDefault("sort", "id"));
    if (sort == null) throw new IllegalArgumentException("排序字段非法");
    String dir = p.getOrDefault("direction", "asc");
    if (!Set.of("asc", "desc").contains(dir)) throw new IllegalArgumentException("排序方向非法");
    var a = new ArrayList<>(q.args());
    a.add(size);
    a.add((long) page * size);
    return Map.of(
        "total",
        r.jdbc()
            .queryForObject(
                "SELECT COUNT(*) FROM variants" + q.where(), Long.class, q.args().toArray()),
        "items",
        r.jdbc()
            .queryForList(
                "SELECT * FROM variants"
                    + q.where()
                    + " ORDER BY "
                    + sort
                    + " "
                    + dir
                    + ",id LIMIT ? OFFSET ?",
                a.toArray()));
  }

  static int integer(String s) {
    try {
      return Integer.parseInt(s);
    } catch (Exception e) {
      throw new IllegalArgumentException("分页参数非法");
    }
  }

  @GetMapping("/datasets/{id}/export")
  public ResponseEntity<StreamingResponseBody> export(
      @PathVariable long id, @RequestParam Map<String, String> p) {
    d.get(id);
    var q = r.query(id, p);
    return ResponseEntity.ok()
        .header("Content-Disposition", "attachment; filename=variants.csv")
        .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
        .body(
            output -> {
              output.write(
                  "CHROM,POS,ID,REF,ALT,QUAL,FILTER,INFO,FORMAT,SAMPLE,TYPE,WARNING\r\n"
                      .getBytes(StandardCharsets.UTF_8));
              long last = 0;
              while (true) {
                var a = new ArrayList<>(q.args());
                a.add(last);
                var rows =
                    r.jdbc()
                        .queryForList(
                            "SELECT * FROM variants"
                                + q.where()
                                + " AND id>? ORDER BY id LIMIT 500",
                            a.toArray());
                if (rows.isEmpty()) break;
                for (var row : rows) {
                  StringJoiner line = new StringJoiner(",");
                  for (String key :
                      List.of(
                          "chrom",
                          "pos",
                          "variant_id",
                          "ref",
                          "alt",
                          "qual",
                          "filter_value",
                          "info",
                          "format_value",
                          "sample_value",
                          "type",
                          "warning")) {
                    String v = Objects.toString(row.get(key), "");
                    if (v.matches("^[=+@-].*")) v = "'" + v;
                    line.add("\"" + v.replace("\"", "\"\"") + "\"");
                  }
                  output.write((line + "\r\n").getBytes(StandardCharsets.UTF_8));
                  last = ((Number) row.get("id")).longValue();
                }
                output.flush();
              }
            });
  }
}
