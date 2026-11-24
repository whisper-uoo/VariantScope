package org.variantscope;

import java.util.*;

public class VcfParser {
  public record Variant(
      String chrom,
      long pos,
      String identifier,
      String ref,
      String alt,
      Double qual,
      String filter,
      String info,
      String format,
      String sample,
      String type,
      String warning,
      String raw) {}

  public static Variant parse(String line, int columns) {
    String[] f = line.split("\t", -1);
    if (f.length != columns || f.length < 8) throw new IllegalArgumentException("列数不匹配");
    if (f[0].isBlank() || f[0].length() > 100 || f[0].matches(".*\\s.*"))
      throw new IllegalArgumentException("非法 CHROM");
    long pos;
    try {
      pos = Long.parseLong(f[1]);
    } catch (Exception e) {
      throw new IllegalArgumentException("非法 POS");
    }
    if (pos < 1) throw new IllegalArgumentException("POS 必须大于零");
    if (!f[3].matches("[ACGTNacgtn]+") || f[4].isBlank())
      throw new IllegalArgumentException("非法 REF/ALT");
    for (String allele : f[4].split(",", -1)) {
      if (!allele.matches("[ACGTNacgtn]+|[.]|[*]|<[A-Za-z0-9_:.-]+>")
          && !(allele.matches(".*[\\[\\]].*") && !allele.matches(".*\\s.*")))
        throw new IllegalArgumentException("非法 ALT 等位序列");
    }
    if (f[4].contains(",") && Arrays.asList(f[4].split(",")).contains("."))
      throw new IllegalArgumentException("缺失 ALT 不能与其他等位混用");
    Double q = null;
    if (!f[5].equals(".")) {
      try {
        q = Double.valueOf(f[5]);
      } catch (Exception e) {
        throw new IllegalArgumentException("非法 QUAL");
      }
      if (!Double.isFinite(q) || q < 0) throw new IllegalArgumentException("非法 QUAL");
    }
    if (f[6].isBlank() || f[6].length() > 500 || f[7].isBlank())
      throw new IllegalArgumentException("非法 FILTER/INFO");
    if (!f[7].equals(".")) {
      Set<String> infoKeys = new HashSet<>();
      for (String part : f[7].split(";", -1)) {
        String[] kv = part.split("=", 2);
        if (!kv[0].matches("[A-Za-z_][A-Za-z0-9_.]*")
            || !infoKeys.add(kv[0])
            || (kv.length == 2 && kv[1].isEmpty()))
          throw new IllegalArgumentException("非法或重复 INFO 属性");
      }
    }
    String ref = f[3].toUpperCase(Locale.ROOT),
        alt = f[4].toUpperCase(Locale.ROOT),
        type = "UNSUPPORTED",
        warning = "";
    if (alt.contains(",")) warning = "多等位记录未拆分，不计入 SNV/InDel/TiTv";
    else if (!alt.matches("[ACGTN]+")) warning = "符号、缺失 ALT 或结构变异未分类";
    else if (ref.equals(alt)) throw new IllegalArgumentException("REF 与 ALT 相同");
    else if (ref.length() == 1 && alt.length() == 1) type = "SNV";
    else if (ref.length() == 1 && alt.startsWith(ref)) type = "INSERTION";
    else if (alt.length() == 1 && ref.startsWith(alt)) type = "DELETION";
    else {
      type = "COMPLEX";
      warning = "复杂替换未规范化";
    }
    String format = f.length > 8 ? f[8] : "", sample = f.length > 9 ? f[9] : "";
    if (!format.isEmpty()) {
      String[] keys = format.split(":", -1), values = sample.split(":", -1);
      if (values.length > keys.length) throw new IllegalArgumentException("样本 FORMAT 值过多");
      if (new HashSet<>(Arrays.asList(keys)).size() != keys.length)
        throw new IllegalArgumentException("重复 FORMAT 字段");
      for (int i = 0; i < keys.length; i++) {
        if (!keys[i].matches("[A-Za-z_][A-Za-z0-9_]*"))
          throw new IllegalArgumentException("非法 FORMAT 名称");
        if (keys[i].equals("GT") && i != 0)
          throw new IllegalArgumentException("GT 必须为首个 FORMAT 字段");
        if (keys[i].equals("GT") && i < values.length) {
          for (String allele : values[i].split("[/|]", -1)) {
            if (!allele.equals(".")) {
              try {
                if (Integer.parseInt(allele) > alt.split(",").length)
                  throw new IllegalArgumentException("GT 等位索引越界");
              } catch (NumberFormatException e) {
                throw new IllegalArgumentException("非法 GT");
              }
            }
          }
        }
        if (keys[i].equals("GT")
            && i < values.length
            && !values[i].matches("[0-9.]+([/|][0-9.]+)*"))
          throw new IllegalArgumentException("非法 GT");
      }
      if (!format.equals("GT")) warning += (warning.isEmpty() ? "" : "；") + "除 GT 外的 FORMAT 仅原样展示";
    }
    return new Variant(
        f[0], pos, f[2], ref, alt, q, f[6], f[7], format, sample, type, warning, line);
  }

  public static String substitution(String ref, String alt) {
    return ref + ">" + alt;
  }

  public static boolean transition(String ref, String alt) {
    return Set.of("A>G", "G>A", "C>T", "T>C").contains(substitution(ref, alt));
  }
}
