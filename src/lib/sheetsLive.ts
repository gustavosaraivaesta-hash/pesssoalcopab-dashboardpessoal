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

function gvizHtmlUrl(gid: string) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview?gid=${gid}&_=${Date.now()}`;
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

export type AniversarianteRecord = {
  posto: string;
  quadro: string;
  nome: string;
  nomeGuerra?: string;
  nascimento: string; // dd/mm/yyyy (anos com 2 dígitos são normalizados)
};

async function fetchNomesGuerra(): Promise<Map<string, string>> {
  try {
    const res = await fetch(gvizHtmlUrl(GID_INSPECAO), { cache: "no-store" });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const nomes = new Map<string, string>();

    doc.querySelectorAll("table tr").forEach((row) => {
      const cells = row.querySelectorAll("td");
      const nomeCell = cells.item(2);
      if (!nomeCell) return;

      const nomeCompleto = nomeCell.textContent?.trim() ?? "";
      const partesEmNegrito = Array.from(
        nomeCell.querySelectorAll<HTMLElement>("b, strong, span[style*='font-weight:bold'], span[style*='font-weight: bold']"),
      )
        .map((el) => el.textContent?.trim() ?? "")
        .filter(Boolean);

      if (nomeCompleto && partesEmNegrito.length) {
        nomes.set(nomeCompleto.toUpperCase(), partesEmNegrito.join(" "));
      }
    });

    return nomes;
  } catch {
    return new Map();
  }
}

function normalizeNascimento(value: unknown): string {
  const raw = value == null ? "" : String(value).trim();
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return "";

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  let ano = Number(match[3]);
  if (match[3].length === 2) ano += 1900;

  const data = new Date(ano, mes - 1, dia);
  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) return "";

  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

export async function fetchAniversariantes(): Promise<AniversarianteRecord[]> {
  const [rows, nomesGuerra] = await Promise.all([
    fetchGviz(GID_INSPECAO),
    fetchNomesGuerra(),
  ]);
  const out: AniversarianteRecord[] = [];
  for (const r of rows) {
    const posto = r[0] ? String(r[0]).trim() : "";
    const quadro = r[1] ? String(r[1]).trim() : "";
    const nome = r[2] ? String(r[2]).trim() : "";
    const nascimento = normalizeNascimento(r[4]);
    if (!posto || !nome || !nascimento) continue;
    out.push({
      posto: normalizePosto(posto),
      quadro: normalizeQuadro(quadro),
      nome,
      nomeGuerra: nomesGuerra.get(nome.toUpperCase()),
      nascimento,
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
