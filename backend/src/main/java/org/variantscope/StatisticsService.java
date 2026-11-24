package org.variantscope;

import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class StatisticsService {
  final VariantRepository r;

  public StatisticsService(VariantRepository r) {
    this.r = r;
  }

  public Map<String, Object> calculate(long id, Map<String, String> p) {
    var q = r.query(id, p);
    String w = q.where();
    Object[] a = q.args().toArray();
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("total", r.jdbc().queryForObject("SELECT COUNT(*) FROM variants" + w, Long.class, a));
    for (var e :
        Map.of("chromosomes", "chrom", "types", "type", "filters", "filter_value").entrySet())
      out.put(
          e.getKey(),
          r.jdbc()
              .queryForList(
                  "SELECT "
                      + e.getValue()
                      + " AS label,COUNT(*) AS `value` FROM variants"
                      + w
                      + " GROUP BY "
                      + e.getValue()
                      + " ORDER BY label",
                  a));
    out.put(
        "substitutions",
        r.jdbc()
            .queryForList(
                "SELECT CONCAT(ref,'>',alt) AS label,COUNT(*) AS `value` FROM variants"
                    + w
                    + " AND type='SNV' AND ref IN ('A','C','G','T') AND alt IN ('A','C','G','T')"
                    + " GROUP BY ref,alt ORDER BY label",
                a));
    out.put(
        "quality",
        r.jdbc()
            .queryForList(
                "SELECT CASE WHEN qual IS NULL THEN 'Missing' WHEN qual<20 THEN '0–20' WHEN qual<50"
                    + " THEN '20–50' WHEN qual<100 THEN '50–100' ELSE '100+' END AS label,COUNT(*)"
                    + " AS `value` FROM variants"
                    + w
                    + " GROUP BY label ORDER BY label",
                a));
    out.put(
        "positions",
        r.jdbc()
            .queryForList(
                "SELECT chrom AS chromosome,FLOOR((pos-1)/1000000) AS bin,COUNT(*) AS `value` FROM"
                    + " variants"
                    + w
                    + " GROUP BY chrom,FLOOR((pos-1)/1000000) ORDER BY chrom,bin LIMIT 10000",
                a));
    var subs = (List<Map<String, Object>>) out.get("substitutions");
    long ti = 0, tv = 0;
    for (var s : subs) {
      long n = ((Number) s.get("value")).longValue();
      String label = s.get("label").toString();
      if (VcfParser.transition(label.substring(0, 1), label.substring(2))) ti += n;
      else tv += n;
    }
    out.put("transitions", ti);
    out.put("transversions", tv);
    out.put("titv", tv == 0 ? null : (double) ti / tv);
    return out;
  }
}
