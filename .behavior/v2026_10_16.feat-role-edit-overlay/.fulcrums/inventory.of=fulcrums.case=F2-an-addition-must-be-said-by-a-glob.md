# F2 — an addition must be said by a `say:` / `ref:` glob in the mod's boot.yml

- **fork**: how an unheld file becomes an addition — (a) any file at an unheld path is added, (b) only a file a `say:` / `ref:` glob in the mod's boot.yml names, (c) a separate `add:` list
- **taken**: (b). a typo cannot silently become an addition (the wish's own demand), and the key is boot.yml's own — no new list. a glob is an explicit rule, so `say: [briefs/local/**/*.md]` adds by intent, which the wish's done-when allows
- **rework**: clean — a parse rule, before code
- **confidence**: 85% — a wide glob in the mod's boot.yml re-opens the typo door for files under it; that is a chosen tradeoff, named in the yield
- **risk**: low — a wrong rule is a parse change before code; the worst miss is an addition refused loud
- **where**: `1.vision.yield.md` `### the three operations`, `### what is refused`; case 3
- **verdict**: —
