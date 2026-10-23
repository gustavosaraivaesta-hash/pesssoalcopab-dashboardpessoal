import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { isForaDaNeo } from "./utils";

describe("Conformidade de vínculos na NEO", () => {
  test("CARREIRA não é igual a RM2, mesmo com especialidade EN igual", () => {
    assert.equal(isForaDaNeo("EN", "EN", "CARREIRA", "RM2"), true);
    assert.equal(isForaDaNeo("EN", "EN", "RM2", "CARREIRA"), true);
  });
  test("RM-2 equivale a RM2, mas não a CARREIRA", () => {
    assert.equal(isForaDaNeo("EN", "EN", "RM-2", "RM2"), false);
    assert.equal(isForaDaNeo("EN", "EN", "CARREIRA", "RM-2"), true);
  });
  test("opções vazias e traços são CARREIRA, não RM2", () => {
    assert.equal(isForaDaNeo("EN", "EN", "", "RM2"), true);
    assert.equal(isForaDaNeo("EN", "EN", "-", "CARREIRA"), false);
  });
  test("TTC correspondente preserva conformidade e aliases RM1", () => {
    assert.equal(isForaDaNeo("EN", "CN", "TTC", "RM-1"), false);
    assert.equal(isForaDaNeo("EN", "EN", "TTC", "CARREIRA"), true);
  });
});