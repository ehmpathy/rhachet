# F23 — the content defect operations stay flat in `boot/` in this pr

- **fork**: move the `asRoleContentDefect*` transformers and the content scans under `boot/contentDefects/`, or leave them in `boot/` beside the render they read
- **taken**: leave them in `boot/` in this pr; the cluster move is a dream
- **why**: the move touches 13 files and every import of them, in a pr whose review surface is already large, and it changes no behavior. `rule.prefer.directory.subdomain-clusters` grades a nitpick, and a rename across files is real work by `rule.always.fix-forward-under-scouts-honor` (not CLEAN), so it earns its own pr
- **counter (i005 r11)**: one noun, no cluster
- **answer**: agreed on the shape, not on when. the dream `.dream/v2026_11_21.refactor.cluster-the-role-content-defect-operations.md` holds the move
- **rework**: clean. a pure move, with an import rewrite
- **confidence**: 85%
- **where**: peer review r11 nitpick.2 (i005)
- **verdict**: open
