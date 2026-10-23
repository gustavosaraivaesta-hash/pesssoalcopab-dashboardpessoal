import { describe, expect, test } from "bun:test";
import { isForaDaNeo } from "./utils";

describe("Conformidade de vínculos na NEO", () => {
  test("CARREIRA não é igual a RM2, mesmo com especialidade EN igual", () => {
    expect(isForaDaNeo("EN", "EN", "CARREIRA", "RM2")).toBe(true);
    expect(isForaDaNeo("EN", "EN", "RM2", "CARREIRA")).toBe(true);
  });
  test("RM-2 equivale a RM2, mas não a CARREIRA", () => {
    expect(isForaDaNeo("EN", "EN", "RM-2", "RM2")).toBe(false);
    expect(isForaDaNeo("EN", "EN", "CARREIRA", "RM-2")).toBe(true);
  });
  test("opções vazias e traços são CARREIRA, não RM2", () => {
    expect(isForaDaNeo("EN", "EN", "", "RM2")).toBe(true);
    expect(isForaDaNeo("EN", "EN", "-", "CARREIRA")).toBe(false);
  });
  test("TTC correspondente preserva conformidade e aliases RM1", () => {
    expect(isForaDaNeo("EN", "CN", "TTC", "RM-1")).toBe(false);
    expect(isForaDaNeo("EN", "EN", "TTC", "CARREIRA")).toBe(true);
  });
});