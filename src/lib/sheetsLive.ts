// Busca dinâmica das planilhas (gviz JSON) para Inspeção de Saúde e Cursos
import type { InspecaoRecord } from "@/data/inspecaoSaude";
import type { CursoRealizado } from "@/data/cursosRealizados";

const SHEET_ID = "1Tty6PMRCTttRXX_kTtpMdzCMxEBejm7xTR58ySj-hfY";
const GID_INSPECAO = "869786467";
const GID_CURSOS = "0";

function gvizUrl(gid: string) {
  // cache-buster garante dados sempre frescos
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}&_=${Date.now()}`;
}

async function fetchGviz(gid: string): Promise<any[][]> {
  const res = await fetch(gvizUrl(gid), { cache: "no-store" });
  const text = await res.text();
  const m = text.match(/setResponse\(([\s\S]*?)\);?\s*$/);
  if (!m) throw new Error("Resposta inesperada da planilha");
  const json = JSON.parse(m[1]);
  const rows = json.table.rows as Array<{ c: Array<{ v: any; f?: string } | null> }>;
  return rows.map((r) =>
    r.c.map((c) => (c == null ? null : c.f ?? c.v)),
  );
}

function normalizePosto(p: string): string {
  // "2°SG" -> "2° SG", mantém demais
  return p.replace(/^(\d+)°\s*SG$/i, "$1° SG").trim();
}

function normalizeQuadro(q: string): string {
  return q.replace(/[()]/g, "").trim();
}

export async function fetchInspecaoSaude(): Promise<InspecaoRecord[]> {
  const rows = await fetchGviz(GID_INSPECAO);
  const out: InspecaoRecord[] = [];
  for (const r of rows) {
    const posto = r[0] ? String(r[0]).trim() : "";
    const quadro = r[1] ? String(r[1]).trim() : "";
    const nome = r[2] ? String(r[2]).trim() : "";
    const validade = r[3] ? String(r[3]).trim() : "";
    if (!posto || !nome || !validade) continue;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(validade)) continue;
    out.push({
      posto: normalizePosto(posto),
      quadro: normalizeQuadro(quadro),
      nome,
      validade,
    });
  }
  return out;
}

export async function fetchCursosRealizados(): Promise<CursoRealizado[]> {
  const rows = await fetchGviz(GID_CURSOS);
  const out: CursoRealizado[] = [];
  for (const r of rows) {
    const nome = r[0] ? String(r[0]).trim() : "";
    if (!nome) continue;
    // pula linhas de cabeçalho
    const upper = nome.toUpperCase();
    if (upper === "NOME" || upper.startsWith("CURO") || upper.startsWith("CURSO")) continue;
    const cursos: string[] = [];
    for (let i = 1; i < r.length; i++) {
      const v = r[i];
      if (v == null) continue;
      const s = String(v).trim();
      if (!s || s.toUpperCase() === "CURSO") continue;
      cursos.push(s);
    }
    out.push({ nome, cursos });
  }
  return out;
}
