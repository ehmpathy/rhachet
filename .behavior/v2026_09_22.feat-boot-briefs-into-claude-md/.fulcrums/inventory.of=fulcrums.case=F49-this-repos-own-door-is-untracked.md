# F49 — this repo's own brain-dir door stays untracked, so a merge ships the pre-feature shape

- **rework** = dirty
- **status** = OPEN — best-guessed, owed to the council
- **confidence** = 84%
- **where** = this branch's git **index** (`.claude/settings.json`, `.agent/.actors/**`); the dream
  `.dream/v2026_09_25.chore.this-repos-own-door-is-untracked.md`

## .the fork, stated fairly

the `5.5.playtest` byhand walk, step **H2**, measured the worktree and the index apart:

| path | the index holds | the worktree holds |
|---|---|---|
| `.claude` | *(no symlink entry)* | `symbolic link → .agent/.actors/actor.via.slug=.default/brain/.claude` |
| `.claude/settings.json` | `100644` — a regular tracked file | *(resolves through the symlink)* |
| `.agent/.actors/**` | **no rows** | five addable paths, every one `??` |

```
$ git ls-files -s .claude
100644 078674e01c64159a9f61aa0895560d24879f2361 0	.claude/settings.json

$ git status --porcelain --untracked-files=all '.agent/.actors/'
?? .agent/.actors/.gitignore
?? .agent/.actors/actor.via.slug=.default/brain/.claude/.gitignore
?? .agent/.actors/actor.via.slug=.default/brain/.claude/AGENTS.md
?? .agent/.actors/actor.via.slug=.default/brain/.claude/CLAUDE.md
?? .agent/.actors/actor.via.slug=.default/brain/.claude/settings.json
```

the branch ships a brief that states the opposite. `define.brain-dir-repo-vs-actor.md`:

> *"`AGENTS.md` and the `CLAUDE.md` symlink stay tracked in the default actor's dir, the one dir
> under `.agent/.actors/` that git sees."*

and `.agent/.actors/.gitignore` is written to make that possible — `/*` ignored, then
`!/.gitignore` and `!/actor.via.slug=.default/` negated so git can see exactly those. ⇒ the intent is
declared twice over, and the index does not match it.

| the fork | the case for it |
|---|---|
| **stage the door now** | the playtest stone's mandate is literal: *"if you detect it, you fix it. no exceptions."* a brief this branch ships claims the files are tracked; the cheapest way to make the claim true is to track them |
| **defer it — TAKEN** | the divergence is in this repo's **release shape**, never in the feature's behavior. the behavior is proved end-to-end on a committed tree by the journey's `[t8.1]`, and `prepare` rebuilds the door on every non-CI clone. the repair fails both halves of the SAFE/CLEAN test |

## .taken, and why at the time

**deferred**, on the SAFE/CLEAN test (`rule.always.fix-forward-under-scouts-honor`):

- **safe — no.** the repair is not an add; it is a **replacement of a tracked path by a symlink**.
  `git rm --cached .claude/settings.json` plus a `120000` entry at `.claude` changes what every
  future clone of rhachet receives, and it lands on the same `moved:` migration path that
  `init.incremental` snapshots assert. a wrong shape here is not a stale file, it is a broken door
- **clean — no.** it restructures the branch's **staged** shape from the playtest gate, with 253
  files already staged, and it is not the diff this stone is in

## .why the harm is bounded — the grade is `better`, never urgent

`package.json:99` repairs it on the standard install path:

```json
"prepare": "if [ -e .git ] && [ -z $CI ]; then npm run prepare:husky && npm run prepare:rhachet; fi",
"prepare:rhachet": "rhachet init --keys --hooks --roles mechanic behaver driver …"
```

⇒ a fresh clone that runs `pnpm install` rebuilds the symlink, `AGENTS.md` and `boot.md`. name the
harm that ships (`rule.require.grade-a-concession-by-its-harm`): no security, safety, monetary,
reputation or behavioral harm — only a brief that misreports the tree until someone installs. that
is **`better`**.

## .confidence, and why it is not higher

**84%.** two things hold it below 93%:

1. 🔴 **the same literal-mandate tension F48 carries.** *"if you detect it, you fix it. no
   exceptions"* reads, at its most literal, as a ban on this deferral. whether the mandate reaches a
   repo's own release shape — as against the feature's behavior coverage — is a **scope call the
   wisher owns**, not one to settle alone
2. the intent itself is genuinely two-sided. the brief says **tracked**; the tree says **built on
   install**. both are defensible designs, and the dream's step 1 is to pick one rather than to
   assume the brief is right

⇒ the council rules. if it rules *tracked*, the index change and its clamp land as their own change;
if it rules *built*, the brief is amended instead — and either way the clamp is new work, since today
only the journey's temp tree is clamped and never the real repo's index.

## .the verdict once ruled

*(open)*

## .see also

- `.dream/v2026_09_25.chore.this-repos-own-door-is-untracked.md` — the caught work
- `define.brain-dir-repo-vs-actor.md` — the contract this diverges from
- `blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` — `given('[case1] …')` `when('[t8.1] a git
  clone of the tree; claude -p; rhx init; claude -p')` — the behavior, proved on a committed tree
- `inventory.of=fulcrums.case=F48-the-settings-backup-prune-defers-out-of-this-branch.md` — the same
  mandate-vs-SAFE/CLEAN tension, one gate earlier
