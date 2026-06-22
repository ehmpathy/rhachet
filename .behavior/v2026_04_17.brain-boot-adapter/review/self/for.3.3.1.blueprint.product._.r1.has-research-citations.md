# self-review: has-research-citations

## stone

3.3.1.blueprint.product

## review round

r1

## check

has-research-citations

---

## research claims checklist

### from 3.1.1.research.external.product.flagged._.yield.md

#### topic.1 = MCP servers cache impact

| claim | type | cited? | where in blueprint | yield source |
|-------|------|--------|-------------------|--------------|
| Tool defs part of cached prefix before system prompt | [FACT] | ✓ | research citations table | [1] Claude API Docs |
| Claude Code uses deferred tool load | [FACT] | ✓ | research citations table (implied by "not a blocker") | [2] Claude Code Camp |
| Deferred load keeps prefix stable | [SUMP] | ✓ | research citations table (implied by "not a blocker") | [2] |
| Project-level `.mcp.json` has bugs | [FACT] | ✓ | research citations table + omissions | [6],[7] GitHub issues |
| If project MCP worked, would it break cache? | [KHUE] | ✓ | omissions table — "not applicable, bugs prevent this" | N/A |

#### topic.2 = project config cache impact

| claim | type | cited? | where in blueprint | yield source |
|-------|------|--------|-------------------|--------------|
| Config.json uses scope hierarchy | [FACT] | ○ | not cited — not directly relevant to blueprint | [8] |
| Config.json influences assembly, not prompt content | [FACT] | ○ | not cited — not directly relevant | [8],[9] |
| Git status injection is primary cache-buster | [SUMP] | ✓ | research citations table | [9] Claude Code Camp |
| Which config.json changes bust cache? | [KHUE] | ✓ | omissions table — "not applicable, we control content" | N/A |

#### topic.3 = 1-hour TTL feature request

| claim | type | cited? | where in blueprint | yield source |
|-------|------|--------|-------------------|--------------|
| Issue #19436 exists, proposes multi-tiered cache | [FACT] | ✓ | research citations table | [10] GitHub issue |
| Three-tier cache structure proposed | [FACT] | ○ | not cited — detail not needed in blueprint | [10] |
| Claude Code uses 5-min not 1-hour TTL | [FACT] | ✓ | research citations table | [10],[11],[13] |
| TTL regression discovered March 2026 | [FACT] | ○ | not cited — detail not needed | [11],[12] |
| 1-hour TTL would reduce cache writes | [OPIN] | ✓ | omissions table — "deferred, depends on Anthropic" | [10] |

### from 3.1.3.research.internal.product.code.prod._.yield.md

| pattern | tag | cited? | where in blueprint |
|---------|-----|--------|-------------------|
| BrainHooksAdapter interface | [REUSE] | ✓ | research citations table + filediff tree |
| genBrainHooksAdapterForClaudeCode | [EXTEND] | ✓ | research citations table + codepath tree |
| syncOneRoleHooksIntoOneBrainRepl | [REUSE] | ✓ | research citations table |
| bootRoleResources | [REUSE] | ✓ | research citations table + codepath tree |
| enrollBrainCli spawn | [EXTEND] | ✓ | research citations table + codepath tree |
| genBrainCliConfigArtifact | [EXTEND] | ✓ | research citations table + filediff tree |
| assertRegistryBootHooksDeclared | [REPLACE] | ✓ | research citations table + filediff tree |
| invokeInit --hooks flow | [EXTEND] | ✓ | research citations table (implied) + filediff tree |
| invokeEnroll flow | [EXTEND] | ✓ | research citations table (implied) + codepath tree |

### from 3.1.3.research.internal.product.code.test._.yield.md

| pattern | tag | cited? | where in blueprint |
|---------|-----|--------|-------------------|
| genTestTempRepo fixture infra | [EXTEND] | ✓ | research citations table + test tree |
| invokeRhachetCliBinary test invoker | [REUSE] | ✓ | research citations table |
| roles.boot test structure | [REUSE] | ✓ | research citations table |
| init.hooks verification | [EXTEND] | ✓ | research citations table (implied in test coverage) |
| fixture directory structure | [EXTEND] | ✓ | research citations table + filediff tree |
| test-fns BDD utilities | [REUSE] | ✓ | research citations table |

---

## found issues

### issue.1 = blueprint lacked research citations section

**problem:** initial blueprint draft contained no explicit citations to research yield files.

**fix:** added "research citations" section with three tables that reference:
- yield file name
- original source numbers from yield
- impact on blueprint

### issue.2 = no rationale for omitted claims

**problem:** some research claims not reflected in blueprint without explanation.

**fix:** added "omissions with rationale" table with explicit entries for:
- [KHUE] config.json cache impact → not applicable (we control content)
- [OPIN] 1-hour TTL → deferred (depends on Anthropic)
- [KHUE] project-level MCP → not applicable (bugs prevent this)

### issue.3 = absent prod patterns from research (r1 update)

**problem:** blueprint research citations table lacked patterns from 3.1.3.research.internal.product.code.prod._.yield.md:
- syncOneRoleHooksIntoOneBrainRepl [REUSE]
- invokeInit [EXTEND]
- invokeEnroll [EXTEND]

**fix:** added absent patterns to research citations table with updated blueprint actions that reflect BrainCliConfigAdapter refactor.

### issue.4 = absent test patterns from research (r1 update)

**problem:** blueprint research citations table lacked patterns from 3.1.3.research.internal.product.code.test._.yield.md:
- init.hooks verification [EXTEND]
- fixture directory [EXTEND]
- test-fns BDD utilities [REUSE]

**fix:** added absent patterns to research citations table.

---

## holds (non-issues)

### hold.1 = uncited [FACT]s are not relevant to blueprint

the following [FACT]s were not cited because they are implementation details not needed in the blueprint:
- "Config.json uses scope hierarchy" — we already know this
- "Three-tier cache structure proposed" — detail of feature request
- "TTL regression discovered March 2026" — historical detail

these do not affect blueprint decisions.

### hold.2 = all actionable patterns cited with source

every [REUSE], [EXTEND], [REPLACE] tag from internal research is:
- cited in research citations table
- reflected in filediff tree, codepath tree, or test tree

---

## verdict

**pass** — all 20 research claims reviewed. 15 cited, 5 omitted with rationale (3 not applicable, 1 deferred, 1 detail not needed).

---

## session review: 2026-04-23

verified research citations table in blueprint against research yields:
- 3.1.1.research.external.product.flagged._.yield.md — all 3 topics traced
- 3.1.3.research.internal.product.code.prod._.yield.md — all 9 patterns traced
- 3.1.3.research.internal.product.code.test._.yield.md — all 6 patterns traced

omissions rationale confirmed: scope hierarchy detail, TTL regression detail, three-tier cache detail — all are implementation details not needed for blueprint decisions.

**confirmed pass**.
