import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPlate, looksLikePlate, normalizePlate, plateSearchKey } from "./plate.ts";

test("normalizePlate: razmaci, crtice i mala slova", () => {
  assert.equal(normalizePlate("bg 123-ab"), "BG123AB");
  assert.equal(normalizePlate(" BG-123-AB "), "BG123AB");
  assert.equal(normalizePlate("bg.123.ab"), "BG123AB");
});

test("normalizePlate: ćirilica se preslovljava", () => {
  assert.equal(normalizePlate("БГ 123-АБ"), "BG123AB");
  assert.equal(normalizePlate("ЧА 456-ЖШ"), "ČA456ŽŠ");
  assert.equal(normalizePlate("ни 1234 ђћ"), "NI1234ĐĆ");
});

test("normalizePlate: zadržava dijakritike latinice", () => {
  assert.equal(normalizePlate("ča 123 ab"), "ČA123AB");
  assert.equal(normalizePlate("ŠA-99-Ž"), "ŠA99Ž");
});

test("plateSearchKey: bez dijakritika", () => {
  assert.equal(plateSearchKey("ČA 123-AB"), "CA123AB");
  assert.equal(plateSearchKey("ŠA 1-ĐŽ"), "SA1DZ");
});

test("formatPlate: srpski format", () => {
  assert.equal(formatPlate("BG123AB"), "BG 123-AB");
  assert.equal(formatPlate("NI1234CD"), "NI 1234-CD");
  assert.equal(formatPlate("ČA45678Ž"), "ČA 45678-Ž");
});

test("formatPlate: nepoznat format ostaje normalizovan", () => {
  assert.equal(formatPlate("M1234AB"), "M1234AB");
  assert.equal(formatPlate("ABC123"), "ABC123");
});

test("looksLikePlate", () => {
  assert.equal(looksLikePlate("bg123ab"), true);
  assert.equal(looksLikePlate("BG 12"), false);
  assert.equal(looksLikePlate("Petar"), false);
  assert.equal(looksLikePlate("0641234567"), false);
});
