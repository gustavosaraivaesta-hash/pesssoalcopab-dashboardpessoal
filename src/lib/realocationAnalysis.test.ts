import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { buildAnalysisBalances, applyAnalysisMoves, suggestAnalysisMoves, type AnalysisRecord } from "./realocationAnalysis";

const record = (overrides: Partial<AnalysisRecord>): AnalysisRecord => ({ id: "1", om: "A", tipoSetor: "DIVISÃO", ocupado: true, nome: "MILITAR", postoTmft: "CB", postoEfe: "CB", quadroTmft: "TIC", quadroEfe: "PD", opcaoTmft: "CARREIRA", opcaoEfe: "CARREIRA", ...overrides });
describe("Realocação somente para análise", () => {
  test("realoca sucessivamente sem reutilizar excedentes nem alterar dados originais", () => {
    const records = [record({}), record({ tipoSetor: "EXTRA LOTAÇÃO" }), record({ tipoSetor: "EXTRA LOTAÇÃO" }), record({ om: "B", ocupado: false, nome: "" }), record({ om: "C", ocupado: false, nome: "" })];
    const original = JSON.stringify(records);
    const balances = buildAnalysisBalances([{ category: "PRAÇAS", records }]);
    const baseline = JSON.stringify(balances);
    const moves = suggestAnalysisMoves(balances);
    assert.equal(moves.reduce((sum, move) => sum + move.quantity, 0), 2);
    const result = applyAnalysisMoves(balances, moves);
    assert.equal(result.find(item => item.om === "A")?.actual, 1);
    assert.equal(suggestAnalysisMoves(result).length, 0);
    assert.equal(JSON.stringify(records), original);
    assert.equal(JSON.stringify(balances), baseline);
  });
  test("CARREIRA não atende necessidade RM2", () => {
    const balances = buildAnalysisBalances([{ category: "PRAÇAS", records: [record({ tipoSetor: "SEM NEO" }), record({ om: "B", ocupado: false, nome: "", opcaoTmft: "RM2" })] }]);
    assert.equal(suggestAnalysisMoves(balances).length, 0);
  });
  test("correspondência só por especialidade: posto não separa, categoria separa", () => {
    const records = [record({ tipoSetor: "SEM NEO", postoEfe: "SO" }), record({ om: "B", ocupado: false, nome: "", postoTmft: "SO" }), record({ om: "C", ocupado: false, nome: "", postoTmft: "1T" })];
    const balances = buildAnalysisBalances([{ category: "PRAÇAS", records }, { category: "OFICIAIS", records: [record({ om: "D", ocupado: false, nome: "" })] }]);
    const moves = suggestAnalysisMoves(balances);
    assert.equal(moves.length, 1);
    assert.equal(moves[0]?.target.om, "B");
    assert.ok(moves[0]?.source.rank.includes("SO"));
  });
  test("simulação rejeita quantidade superior ao excedente da origem", () => {
    const balances = buildAnalysisBalances([{ category: "PRAÇAS", records: [record({ tipoSetor: "SEM NEO" }), record({ om: "B", ocupado: false, nome: "" })] }]);
    const suggestion = suggestAnalysisMoves(balances)[0];
    assert.ok(suggestion);
    assert.deepEqual(applyAnalysisMoves(balances, [{ ...suggestion, quantity: 2 }]), balances);
  });
});