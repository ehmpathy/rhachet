# inventory.of=fulcrums

> best-guessed forks of the route. F1–F11 from the `1.vision` stone; F12–F18 from the
> `3.3.1.blueprint.product` stone's open questions (Q1–Q7, in order); F19–F23 from the
> `5.1.execution.from_vision` stone; F24–F29 from the `5.3.verification` stone. one entry per fulcrum,
> `case=F$n-$slug`. axis = `case` (occurrences, declared as they arise).

`risk` = what ships if the best guess is wrong. **high**: a behavior harm reaches a clone or an extant repo · **medium**: a costly rework, no user harm · **low**: a clean swap. each entry names the harm behind its grade. **low (bar)**: graded on the director's bar for a vision fulcrum — risky only if it touches a credential or a prod write (ca-2675884743); a behavior harm under that bar is owed a blueprint test, never a halt.

| case | title | rework | risk | status | confidence |
|---|---|---|---|---|---|
| [F1](./inventory.of=fulcrums.case=F1-match-key-is-path-relative-to-role-dir.md) | the match key is the path relative to the role dir | dirty | low (bar) | ruled, taken (director) | 90% |
| [F2](./inventory.of=fulcrums.case=F2-an-addition-must-be-said-by-a-glob.md) | an addition must be said by a `say:` / `ref:` glob in the mod's boot.yml | clean | low | open | 85% |
| [F3](./inventory.of=fulcrums.case=F3-edit-yml-holds-of-and-bases.md) | `edit.yml` holds `of:` and the per-file bases | clean | — | withdrawn (S2) | — |
| [F4](./inventory.of=fulcrums.case=F4-version-pester-fails-the-stop-not-the-upgrade.md) | the version pester fails the stop, never the upgrade | clean | low | superseded by F23 (b) | 75% |
| [F5](./inventory.of=fulcrums.case=F5-scope-briefs-and-skills-inits-keyrack-refused.md) | scope = briefs and skills; inits, keyrack, readme refused | clean | low | half settled (S1) | 85% |
| [F6](./inventory.of=fulcrums.case=F6-no-mod-verbs-roles-cost-marks-mods.md) | no mod verbs; `rhx roles cost` marks a modded role | clean | low | open | 70% |
| [F7](./inventory.of=fulcrums.case=F7-mod-glyph.md) | `[~]` marks a modded role, in the bhuild legend | clean | low | settled (S4, S5) | 95% |
| [F8](./inventory.of=fulcrums.case=F8-a-modded-role-is-materialized-as-per-file-links.md) | a modded role is materialized as per-file links | dirty | low (bar) | ruled, taken (director); stale-link boot clamped by a blueprint test | 70% |
| [F9](./inventory.of=fulcrums.case=F9-the-mod-boot-yml-is-read-before-the-roles.md) | the mod's boot.yml sections are read before the role's | clean | medium | open | 80% |
| [F10](./inventory.of=fulcrums.case=F10-a-not-a-role-hook-needs-is-refused-at-render.md) | a `not` of a skill a role hook invokes is refused at render | clean | low | open | 75% |
| [F11](./inventory.of=fulcrums.case=F11-same-slug-roles-boot-apart-this-included.md) | same-slug roles boot apart, a `.this` role included; a bare slug carries every repo; hashes stay | dirty | low (bar) | ruled, taken (a1 S5; b1, c1 director); `.this`-override repos owed a research count + a test; ships on the commander's release review | 75% |
| [F12](./inventory.of=fulcrums.case=F12-a-mod-uses-its-roles-boot-yml-mode.md) | a mod uses its role's boot.yml mode (Q1) | clean | low | ruled, taken (director) | 85% |
| [F13](./inventory.of=fulcrums.case=F13-one-sync-writes-the-modded-view-on-every-render.md) | one sync writes the modded view, on every render path (Q2) | clean | low | ruled, taken (director) | 85% |
| [F14](./inventory.of=fulcrums.case=F14-a-stale-view-fails-the-boot-and-names-rhx-init.md) | a stale modded view fails the boot and names `rhx init` (Q3) | clean | low | ruled, taken (director) | 80% |
| [F15](./inventory.of=fulcrums.case=F15-one-release-then-the-nheuron-move.md) | one release, then the nheuron move (Q4) | clean | low | ruled, taken (director) | 85% |
| [F16](./inventory.of=fulcrums.case=F16-the-not-refusal-reads-the-two-skill-file-forms.md) | the `not` refusal reads the two hook forms that name a skill file (Q5) | clean | low | ruled, taken (director) | 85% |
| [F17](./inventory.of=fulcrums.case=F17-delete-the-per-slug-dedupe.md) | delete `asRoleRefsFirstSeenPerRole` (Q6) | clean | low | ruled, taken (director) | 95% |
| [F18](./inventory.of=fulcrums.case=F18-a-mod-of-a-this-role-is-refused.md) | a mod of a `.this` role is refused (Q7) | clean | low | ruled, taken (director) | 90% |
| [F19](./inventory.of=fulcrums.case=F19-the-onstop-mod-check-runs-outside-the-budget-memo.md) | the onStop mod check runs outside the budget memo | clean | low | moot — F23 (b) removed the check | 92% |
| [F20](./inventory.of=fulcrums.case=F20-the-blueprint-suites-beyond-roles-mods-ship-in-a-followup.md) | the blueprint suites beyond roles.mods ship in a follow-up | clean | medium | closed — the suites landed in #702 | 80% |
| [F21](./inventory.of=fulcrums.case=F21-the-mods-decomposition-nitpicks-wait-for-a-third-use.md) | the mods decomposition nitpicks wait for a third use | clean | low | closed — landed in #702 | 85% |
| [F22](./inventory.of=fulcrums.case=F22-mods-composes-boot-brains-and-link-reads-never-reimplements-them.md) | mods composes the boot, brains and link reads; it never reimplements them | clean | low | open | 85% |
| [F23](./inventory.of=fulcrums.case=F23-a-mod-arms-the-stop-hook-a-second-framework-exception.md) | a mod arms the stop hook: a second framework exception, or a pester at boot alone | clean | medium | ruled (b) — director, 2026-11-09 (S9) | 60% |
| [F24](./inventory.of=fulcrums.case=F24-the-live-brain-gate-and-the-ci-gates-stay-as-main-ships-them.md) | the live-brain gate and the ci gates stay as main ships them, at 5.3 | clean | low | open | 85% |
| [F25](./inventory.of=fulcrums.case=F25-acceptance-is-proven-at-the-nvmrc-pin-not-the-host-node.md) | acceptance is proven at the .nvmrc pin, not the host node, at 5.3 | clean | low | open | 80% |
| [F26](./inventory.of=fulcrums.case=F26-rhx-run-short-flag-collision-fixed-in-this-pr.md) | the `rhx run` short-flag collision (`-r`), found at the 5.3 walk, is fixed in this pr | clean | low | done in #702 | 92% |
| [F27](./inventory.of=fulcrums.case=F27-a-transformer-caselist-keeps-the-data-driven-test-form.md) | a transformer caselist keeps the data-driven `test()` form | clean | low | open | 88% |
| [F28](./inventory.of=fulcrums.case=F28-cross-surface-vocabulary-nitpicks-wait-for-a-dedicated-pr.md) | the cross-surface vocabulary nitpicks of the 5.3 l3 lanes wait for a dedicated pr | clean | low | open | 80% |
| [F29](./inventory.of=fulcrums.case=F29-relink-and-print-mode-enroll-rest-on-their-clamps.md) | `roles link` and a print-mode `enroll` over a mod rest on their clamps | clean | low | open | 85% |

gaps: none known — each best-guess in the vision and blueprint yields maps to a row above.
