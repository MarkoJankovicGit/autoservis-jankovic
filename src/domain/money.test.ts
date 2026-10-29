import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, formatQuantity, lineTotal, parseMoney, parseQuantity, sum } from "./money.ts";

test("parseMoney: domaći zapisi", () => {
  const cases: [string, number][] = [
    ["12.450,00", 1245000],
    ["12450", 1245000],
    ["12450,5", 1245050],
    ["12 450", 1245000],
    ["12450.50", 1245050],
    ["12.450", 1245000],
    ["1.234.567,89", 123456789],
    ["0,99", 99],
    ["2.400 RSD", 240000],
    ["-500", -50000],
  ];
  for (const [input, para] of cases) assert.equal(parseMoney(input), para, input);
});

test("parseMoney: neispravno", () => {
  for (const input of ["", "abc", "12,345,6", "1.23.4", "12,345", "1.2345"]) assert.equal(parseMoney(input), null, input);
});

test("formatMoney", () => {
  const nbsp = (s: string) => s.replace(/ /g, " ");
  assert.equal(nbsp(formatMoney(1245000)), "12.450,00 RSD");
  assert.equal(nbsp(formatMoney(1245050, { decimals: false })), "12.451 RSD");
  assert.equal(nbsp(formatMoney(99, { currency: false })), "0,99");
});

test("parseQuantity i formatQuantity", () => {
  assert.equal(parseQuantity("2,5"), 2500);
  assert.equal(parseQuantity("4.5"), 4500);
  assert.equal(parseQuantity("0,333"), 333);
  assert.equal(parseQuantity("1"), 1000);
  assert.equal(parseQuantity("1,2345"), null);
  assert.equal(parseQuantity("-1"), null);
  assert.equal(formatQuantity(2500), "2,5");
  assert.equal(formatQuantity(1000), "1");
});

test("lineTotal: količina, cena i popust sa zaokruživanjem na paru", () => {
  assert.equal(lineTotal(1000, 240000), 240000); // 1 × 2.400,00
  assert.equal(lineTotal(4500, 115000), 517500); // 4,5 l × 1.150,00
  assert.equal(lineTotal(333, 100000), 33300); // 0,333 × 1.000,00
  assert.equal(lineTotal(1000, 99999, 1000), 89999); // 999,99 − 10 % = 899,991 -> 899,99
  assert.equal(lineTotal(2500, 333, 0), 833); // 8,325 -> 8,33 (polovina naviše)
  assert.equal(lineTotal(1000, 1000, 10000), 0);
  assert.throws(() => lineTotal(1000, 1000, 10001), RangeError);
});

test("sum", () => {
  assert.equal(sum([240000, 517500, 33300]), 790800);
  assert.equal(sum([]), 0);
});
