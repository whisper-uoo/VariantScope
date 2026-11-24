package org.variantscope;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class VariantRepository {
  final JdbcTemplate db;

  public VariantRepository(JdbcTemplate db) {
    this.db = db;
  }

  public JdbcTemplate jdbc() {
    return db;
  }

  public record Query(String where, List<Object> args) {}

  public Query query(long id, Map<String, String> p) {
    StringBuilder s = new StringBuilder(" WHERE dataset_id=?");
    List<Object> a = new ArrayList<>();
    a.add(id);
    for (String key : List.of("chrom", "type", "filter", "variantId")) {
      String v = p.get(key);
      if (v != null && !v.isBlank()) {
        s.append(" AND ")
            .append(
                Map.of("filter", "filter_value", "variantId", "variant_id").getOrDefault(key, key))
            .append("=?");
        a.add(v);
      }
    }
    for (String key : List.of("start", "end", "minQual")) {
      String v = p.get(key);
      if (v != null && !v.isBlank()) {
        double n;
        try {
          n = Double.parseDouble(v);
        } catch (Exception e) {
          throw new IllegalArgumentException("非法数值筛选");
        }
        if (!Double.isFinite(n)
            || n < 0
            || (!key.equals("minQual") && (n != Math.floor(n) || n > Long.MAX_VALUE)))
          throw new IllegalArgumentException("筛选范围非法");
        s.append(
            key.equals("start")
                ? " AND pos>=?"
                : key.equals("end") ? " AND pos<=?" : " AND qual>=?");
        a.add(n);
      }
    }
    if (p.containsKey("start")
        && p.containsKey("end")
        && !p.get("start").isBlank()
        && !p.get("end").isBlank()
        && Double.parseDouble(p.get("start")) > Double.parseDouble(p.get("end")))
      throw new IllegalArgumentException("起点不能超过终点");
    return new Query(s.toString(), a);
  }

  public void insert(long id, List<VcfParser.Variant> rows, List<Long> lines) {
    db.batchUpdate(
        "INSERT INTO"
            + " variants(dataset_id,line_no,chrom,pos,variant_id,ref,alt,qual,filter_value,info,format_value,sample_value,type,warning,raw_line)"
            + " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        new org.springframework.jdbc.core.BatchPreparedStatementSetter() {
          public int getBatchSize() {
            return rows.size();
          }

          public void setValues(java.sql.PreparedStatement p, int i) throws java.sql.SQLException {
            var v = rows.get(i);
            Object[] a = {
              id,
              lines.get(i),
              v.chrom(),
              v.pos(),
              v.identifier(),
              v.ref(),
              v.alt(),
              v.qual(),
              v.filter(),
              v.info(),
              v.format(),
              v.sample(),
              v.type(),
              v.warning(),
              v.raw()
            };
            for (int j = 0; j < a.length; j++) p.setObject(j + 1, a[j]);
          }
        });
  }
}
