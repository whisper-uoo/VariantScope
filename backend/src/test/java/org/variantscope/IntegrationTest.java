package org.variantscope;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:vcf;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
      "spring.datasource.username=sa",
      "spring.datasource.password="
    })
class IntegrationTest {
  @Autowired DatasetService d;
  @Autowired VariantRepository r;
  @Autowired StatisticsService s;

  @BeforeEach
  void clean() {
    r.jdbc().update("DELETE FROM datasets");
  }

  String header = "##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n";

  Map<String, Object> upload(String text) throws Exception {
    return d.upload(
        new MockMultipartFile("file", "x.vcf", "text/plain", text.getBytes()), "test", null);
  }

  @Test
  void importQueryStatisticsDuplicate() throws Exception {
    String text =
        header + "1\t1\t.\tA\tG\t30\tPASS\t.\n1\t2\t.\tA\tT\t.\t.\t.\n2\t3\t.\tN\tA\t10\tq10\t.\n";
    var ds = upload(text);
    long id = ((Number) ds.get("id")).longValue();
    assertEquals("READY", ds.get("status"));
    var st = s.calculate(id, Map.of());
    assertEquals(1.0, st.get("titv"));
    assertEquals(3L, st.get("total"));
    assertEquals(1L, s.calculate(id, Map.of("minQual", "20", "chrom", "1")).get("total"));
    assertThrows(IllegalStateException.class, () -> upload(text));
    assertThrows(
        IllegalArgumentException.class, () -> r.query(id, Map.of("start", "10", "end", "1")));
  }

  @Test
  void failureRollsBackBatches() throws Exception {
    var ds = upload(header + "1\t1\t.\tA\tG\t30\tPASS\t.\n".repeat(501) + "invalid\n");
    assertEquals("FAILED", ds.get("status"));
    assertEquals(0L, r.jdbc().queryForObject("SELECT COUNT(*) FROM variants", Long.class));
    assertTrue(ds.get("error").toString().contains("504"));
  }

  @Test
  void invalidHeaderAndMultiSample() throws Exception {
    assertEquals("FAILED", upload("hello").get("status"));
    assertEquals("FAILED", upload(header.replace("INFO\n", "INFO\tFORMAT\tA\tB\n")).get("status"));
  }

  @Test
  void emptyAndOversizedFilesAreRejected() {
    assertThrows(
        IllegalArgumentException.class,
        () -> d.upload(new MockMultipartFile("file", new byte[0]), "x", null));
    MockMultipartFile oversized =
        new MockMultipartFile("file", new byte[] {1}) {
          public long getSize() {
            return 101L * 1024 * 1024;
          }
        };
    assertThrows(IllegalArgumentException.class, () -> d.upload(oversized, "x", null));
  }

  @Test
  void undefinedRatioAndMissingQual() throws Exception {
    var ds = upload(header + "1\t1\t.\tA\tG\t.\tPASS\t.\n");
    long id = ((Number) ds.get("id")).longValue();
    assertNull(s.calculate(id, Map.of()).get("titv"));
    assertEquals(0L, s.calculate(id, Map.of("minQual", "0")).get("total"));
    var q = r.query(id, Map.of("chrom", "1' OR 1=1 --"));
    assertEquals(
        0L,
        r.jdbc()
            .queryForObject(
                "SELECT COUNT(*) FROM variants" + q.where(), Long.class, q.args().toArray()));
  }
}
