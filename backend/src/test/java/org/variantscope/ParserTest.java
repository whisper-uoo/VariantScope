package org.variantscope;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class ParserTest {
  String line(String ref, String alt, String q) {
    return "1\t10\trs1\t" + ref + "\t" + alt + "\t" + q + "\tPASS\tDP=10\tGT\t0/1";
  }

  @Test
  void classifications() {
    assertEquals("SNV", VcfParser.parse(line("A", "G", "10"), 10).type());
    assertEquals("INSERTION", VcfParser.parse(line("A", "AT", "."), 10).type());
    assertEquals("DELETION", VcfParser.parse(line("AT", "A", "."), 10).type());
    assertEquals("UNSUPPORTED", VcfParser.parse(line("A", "G,T", "."), 10).type());
    assertEquals("UNSUPPORTED", VcfParser.parse(line("A", "<DEL>", "."), 10).type());
  }

  @Test
  void quality() {
    assertNull(VcfParser.parse(line("A", "G", "."), 10).qual());
    for (String q : new String[] {"NaN", "-1", "Infinity", "bad"})
      assertThrows(IllegalArgumentException.class, () -> VcfParser.parse(line("A", "G", q), 10));
  }

  @Test
  void invalid() {
    assertThrows(IllegalArgumentException.class, () -> VcfParser.parse(line("A", "A", "1"), 10));
    assertThrows(IllegalArgumentException.class, () -> VcfParser.parse("bad", 8));
    assertThrows(
        IllegalArgumentException.class,
        () -> VcfParser.parse(line("A", "G", "1").replace("\t10\t", "\t0\t"), 10));
  }

  @Test
  void transitions() {
    assertTrue(VcfParser.transition("A", "G"));
    assertTrue(VcfParser.transition("T", "C"));
    assertFalse(VcfParser.transition("A", "T"));
  }

  @Test
  void lineLimit() {
    assertThrows(
        IllegalArgumentException.class,
        () -> DatasetService.boundedLine(new java.io.StringReader("x".repeat(65537))));
  }

  @Test
  void genotypeBoundsAndInfoValidation() {
    assertThrows(
        IllegalArgumentException.class,
        () -> VcfParser.parse(line("A", "G", "10").replace("0/1", "0/2"), 10));
    assertThrows(
        IllegalArgumentException.class,
        () -> VcfParser.parse(line("A", "G", "10").replace("DP=10", "DP="), 10));
    assertThrows(
        IllegalArgumentException.class,
        () -> VcfParser.parse(line("A", "G", "10").replace("DP=10", "DP=1;DP=2"), 10));
    assertTrue(
        VcfParser.parse(line("A", "G", "10").replace("GT\t0/1", "GT:DP\t./.:5"), 10)
            .warning()
            .contains("FORMAT"));
  }
}
