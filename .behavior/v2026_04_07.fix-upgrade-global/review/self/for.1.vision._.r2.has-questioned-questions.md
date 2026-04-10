# self-review: has-questioned-questions

## triage of open questions

### question 1: should global upgrade be default or opt-in?

**can this be answered via logic?** yes.

**answer:** the wish says "by default, if installed globally". the wisher explicitly chose "default" over "opt-in". this question is already answered by the wish itself.

**verdict:** [answered] — default is the requirement per wish.

---

### question 2: what if global upgrade fails?

**can this be answered via logic?** yes.

**rationale:**
- local upgrade is the core value — must succeed even if global fails
- global upgrade is additive — nice to have, not a blocker
- fail-fast would punish users who just want local upgrade
- warn and continue gives best UX: user gets their local upgrade, plus visibility into the global issue

**verdict:** [answered] — warn and continue. user gets local upgrade; sees hint for global.

---

### question 3: should we support non-npm global installs?

**can this be answered via scope decision?** yes.

**rationale:**
- MVP scope: solve the stated wish
- wisher uses npm (inferred from "rhx" = npm global)
- volta/homebrew are different ecosystems with their own upgrade patterns
- support for them adds complexity without clear demand

**verdict:** [answered] — npm only for MVP. other package managers are future scope if requested.

---

### research question 1: how to detect global npm install location cross-platform

**can this be answered now?** no — requires implementation research.

**what we know:**
- `npm prefix -g` returns global prefix
- `npm list -g rhachet --depth=0` checks if installed
- need to handle: windows vs unix paths, nvm vs system node

**verdict:** [research] — answer in research phase.

---

### research question 2: how to detect if run via npx vs global

**can this be answered now?** no — requires implementation research.

**what we know:**
- npx creates temp directory, may be detectable via argv or cwd
- `process.argv[1]` path may differ between npx and global
- need cross-platform solution

**verdict:** [research] — answer in research phase.

---

### research question 3: permission strategy

**can this be answered now?** partially via logic.

**what we know:**
- sudo prompts are disruptive and platform-specific
- better UX: attempt upgrade, catch EACCES, surface helpful hint
- hint can suggest: "run `sudo npm i -g rhachet@latest` to upgrade global"

**rationale:** we don't need to solve permissions — we just need to handle the error gracefully. attempt → catch → hint.

**verdict:** [answered] — attempt upgrade, catch permission errors, surface hint. no sudo prompt.

---

## summary

| question | verdict | rationale |
|----------|---------|-----------|
| default vs opt-in | [answered] | wish says "by default" |
| fail behavior | [answered] | warn and continue (local is core) |
| non-npm support | [answered] | npm only for MVP |
| detect global location | [research] | technical implementation |
| detect npx vs global | [research] | technical implementation |
| permission strategy | [answered] | attempt → catch → hint |

## updates to vision

the "questions to validate with wisher" section should be updated — these questions are now answered via logic, not wisher input.
