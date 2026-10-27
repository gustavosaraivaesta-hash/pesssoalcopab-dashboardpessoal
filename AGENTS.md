# Project Rules

- Keep specialty redistribution in pure client-side analysis functions with ephemeral simulation state; use existing authenticated, OM-scoped read functions only, so proposals never mutate source data. Match category, canonical specialty, rank, normalized vínculo and officer corpo; count actual profiles independently of planned slots, including SEM NEO and excluding auxiliary licenses/highlights.
- Generate realocation PDFs from a read-only snapshot of the filtered balances and remaining suggestions, label the full simulation sequence separately, and use the shared PDF preview before download so exports never write source data.

- Use `isForaDaNeo` from `src/lib/utils.ts` for NEO conformity in cards, metrics, and exports so vínculo and specialty comparisons stay consistent.
- Use `normalizeVinculo` for exported vínculo labels to preserve the same categories used by NEO conformity.
- For officer slot-based filtering, use EFE fields for SEM NEO records and TMFT fields for regular slots; SEM NEO has no planned fields to compare.
- Use `matchesOfficerVinculoFilter` for filtered officer EFETIVO counts so both planned and actual vínculos match an explicit Opção selection.

- Aniversariantes: obtenha `nomeGuerra` dos trechos em negrito da coluna de nome na planilha e use-o somente no PDF; mantenha o nome completo na tela.
