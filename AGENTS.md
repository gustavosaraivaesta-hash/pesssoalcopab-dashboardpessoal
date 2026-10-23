# Project Rules

- Use `isForaDaNeo` from `src/lib/utils.ts` for NEO conformity in cards, metrics, and exports so vínculo and specialty comparisons stay consistent.
- Use `normalizeVinculo` for exported vínculo labels to preserve the same categories used by NEO conformity.
- For officer slot-based filtering, use EFE fields for SEM NEO records and TMFT fields for regular slots; SEM NEO has no planned fields to compare.
- Use `matchesOfficerVinculoFilter` for filtered officer EFETIVO counts so both planned and actual vínculos match an explicit Opção selection.

- Aniversariantes: obtenha `nomeGuerra` dos trechos em negrito da coluna de nome na planilha e use-o somente no PDF; mantenha o nome completo na tela.
