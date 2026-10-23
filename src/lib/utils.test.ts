import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { isForaDaNeo, normalizeVinculo, getOfficerFilterValue, matchesOfficerVinculoFilter } from "./utils";

describe("Conformidade de vínculos na NEO", () => {
  test("EN CARREIRA tem dois efetivos nas três vagas CARREIRA", () => {
    const records = [
      { tipoSetor: "DIVISÃO", opcaoTmft: "CARREIRA", opcaoEfe: "CARREIRA" },
      { tipoSetor: "DIVISÃO", opcaoTmft: "CARREIRA", opcaoEfe: "RM-2" },
      { tipoSetor: "DIVISÃO", opcaoTmft: "CARREIRA", opcaoEfe: "CARREIRA" },
      { tipoSetor: "DEPARTAMENTO", opcaoTmft: "TTC", opcaoEfe: "CARREIRA" },
    ];
    assert.equal(records.filter(r => normalizeVinculo(r.opcaoTmft) === "CARREIRA").length, 3);
    assert.equal(records.filter(r => matchesOfficerVinculoFilter(r, ["CARREIRA"])).length, 2);
    assert.equal(records.filter(r => matchesOfficerVinculoFilter(r, [])).length, 4);
  });
  test("SEM NEO RM2 não entra no filtro CARREIRA por ter TMFT vazia", () => {
    const record = { tipoSetor: "EXTRA LOTAÇÃO", opcaoTmft: "", opcaoEfe: "RM-2", postoTmft: "", postoEfe: "1T", corpoTmft: "", corpoEfe: "CORM" };
    assert.equal(normalizeVinculo(getOfficerFilterValue(record, "opcao")), "RM2");
    assert.notEqual(normalizeVinculo(getOfficerFilterValue(record, "opcao")), "CARREIRA");
    assert.equal(getOfficerFilterValue(record, "posto"), "1T");
    assert.equal(getOfficerFilterValue(record, "corpo"), "CORM");
  });
  test("vaga regular preserva vínculo previsto independentemente do ocupante", () => {
    assert.equal(getOfficerFilterValue({ tipoSetor: "DIVISÃO", opcaoTmft: "CARREIRA", opcaoEfe: "RM-2" }, "opcao"), "CARREIRA");
  });
  test("relatórios preservam RM2 como vínculo distinto de CARREIRA", () => {
    assert.equal(normalizeVinculo("RM2"), "RM2");
    assert.equal(normalizeVinculo("RM-2"), "RM2");
    assert.equal(normalizeVinculo("CARREIRA"), "CARREIRA");
  });
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