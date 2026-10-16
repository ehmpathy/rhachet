# F15 — the help `default: no filter` assert tolerates a commander wrap

**the fork** — `keyrack.org.help` asserts each `--org` help line states `default: no filter`. (a) a
literal `toContain('default: no filter')` · (b) `toMatch(/default:\s+no\s+filter/)`.

**taken** — (b). commander wraps each option description at the term width. the `--org` line grew
(`@this (the first org in keyrack.yml)`), and on `source` the wrap now falls after `default:`, so the
literal is false on one of the seven commands even though a human reads the same words. the regex
admits whitespace only — the three tokens, their order, and their spell stay exact. the snapshot pins
each render byte for byte, so the precision the literal held is held there, and the regex is the
assert that survives a reflow.

**the counter** — a literal is stricter. true, and it goes red on a layout change no human would call a
defect, which is the false-red `rule.forbid.test-intent-violations` does not ask for.

**rework** — clean. one assert per row.

**confidence** — 85%.

**where** — `blackbox/cli/keyrack.org.help.acceptance.test.ts`, the `default: no filter` assert of each row.

**verdict** — open.
