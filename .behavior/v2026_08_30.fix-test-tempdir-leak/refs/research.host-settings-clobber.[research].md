# research — the `~/.claude/settings.json` clobber on 0901

## .the incident

on 0901, `/home/camper/.claude/settings.json` was overwritten on 2026-10-21, at 08h48 UTC with the
text `{ broken`. the lead from the director: a test fixture for a corrupt settings file, run
against a real HOME.

**status: both gaps closed. read-only. no fix written** — the clamp tree waits on the surdirector
to lift the freeze.

all reads came through `rhx git.repo.get`, at each repo's `origin/main`, on 2026-10-21. this
worktree's own rhachet (v1.47.3) was **not** used as evidence. it predates the link.

---

## gap 1 — the rhachet line that links a temp repo's `.claude/settings.json` to `$HOME`

**read from `ehmpathy/rhachet` `origin/main` (published as 1.50.0).**

two links compose into one path, from the repo to the home file:

| # | link | where |
|---|---|---|
| 1 | `<repo>/.claude` → the repo actor's brain dir | `src/domain.operations/init/boots/setRepoBrainDirSymlink.ts:113-120` — `linkPath = join(repoPath, '.claude')`, then `symlinkSync(linkTarget, linkPath)` |
| 2a | `<brainDir>/settings.of.grove.json` → `$HOME/.claude/settings.json` | `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts:88` builds `groveSource = join(input.home, '.claude', 'settings.json')`; **`:134-138`** `setArrow({ name: grove, path: pathGrove, target: groveSource })` |
| 2b | `<brainDir>/settings.json` → `settings.of.grove.json` | the same file, the arrow directly after `:138` (`target: CLAUDE_SETTINGS_FILENAMES.grove`, seen at `:142`) |

so `<repo>/.claude/settings.json` resolves to the brain dir's `settings.json`, then to
`settings.of.grove.json`, then to the real `$HOME/.claude/settings.json`. a `writeFileSync`
follows all three links.

**the line to name: `setBrainDirSettingsLayout.ts:134-138`** — the arrow whose target is the home
file. `:88` builds that target path.

### where `home` comes from

`src/domain.operations/init/boots/setRepoActorBrainDirLayout.ts:47-51` passes
`home: getHomeDir()`. `src/infra/getHomeDir.ts:9-15` returns `process.env.HOME` verbatim. so the
link aims at **whatever HOME the rhachet process had**.

### how `roles link` reaches it

the test fixture runs `npx rhachet roles link`, not `init`. the path:

```
src/contract/cli/invokeRolesLink.ts:47        syncAndReportBrainDirBoots(...)
  → init/boots/syncAndReportBrainDirBoots.ts   imports syncBootsForBrainDirs
  → init/boots/syncBootsForBrainDirs.ts:13     imports setRepoActorBrainDir
  → init/boots/setRepoActorBrainDir.ts:98      setRepoActorBrainDirLayout({ repoPath })
  → init/boots/setRepoActorBrainDirLayout.ts   :40 setRepoBrainDirSymlink   (link 1)
                                               :47 setBrainDirSettingsLayout (links 2a, 2b)
```

### the condition that hides it on CI

`setBrainDirSettingsLayout.ts:115-128`: when `$HOME/.claude/settings.json` is **absent**, both
grove names are dropped and no arrow is made. so:

| box | home settings file | arrow made? | fixture write lands |
|---|---|---|---|
| a CI runner | absent | no | inside the temp repo — harmless |
| a dev box (0901) | present | **yes** | **the real `~/.claude/settings.json`** |

the defect is invisible exactly where the suite is gated. it bites only on a box with a real
settings file.

### the guard rhachet already has, and why it does not cover this

`setBrainDirSettingsLayout.ts:92-106` refuses to proceed if `settings.of.repo.json` is not a real
file — *"a write through an arrow would land wherever it points"*. so rhachet knows the hazard and
guards its **own** write. it cannot guard a **test's** `fs.writeFileSync` aimed at
`.claude/settings.json`.

---

## gap 2 — the `{ broken` literal in `rhachet-roles-ehmpathy`, and the dir source

**read from `ehmpathy/rhachet-roles-ehmpathy` `origin/main`.**

### the shared fixture: real HOME at link time

`blackbox/.test/invokeHook.ts:21-36` — `genTestDir`:

```ts
const tempDir = genTempDir({ slug, clone: './blackbox/.test/fixtures/repo-with-role', … git: true });
await execAsync('npx rhachet roles link --role mechanic', { cwd: tempDir });   // :33 — no env, so the runner's real HOME
```

so every `genTestDir` repo gets link 1 + links 2a/2b aimed at the **real** home file (gap 1).

the tests do pin `HOME: '/nonexistent-home'`, but only on the **hook child process** via
`invokeHook({ env })`. the fixture writes run in the jest process itself, with the real HOME.

### every write that crosses into the real home file

only `settings.json` and `settings.of.grove.json` are arrows. other names under `.claude/` are
real files in the brain dir.

| file | line | writes | lands in the real `~/.claude/settings.json`? |
|---|---|---|---|
| `blackbox/pretooluse.check-permissions.acceptance.test.ts` | **678** | `'{ broken'` → `.claude/settings.json` (case14, slug `cp-settings-broken`) | ✅ **yes — a match for the 0901 text** |
| same file | 54-59 | `genHookRepo`: a JSON allowlist → `.claude/settings.json`, **on every journey** (~25 calls) | ✅ yes — replaced with a test allowlist, valid JSON |
| same file | 724-727 | `'{ broken'` → `.claude/permission.nudges.local.json` (case15) | ✗ no — not an arrow name; stays in the brain dir |
| `blackbox/sessionstart.notify-permissions.acceptance.test.ts` | **108** | `'{ broken'` → `.claude/settings.json` (case3, slug `sn-both-broken`) | ✅ **yes — a match for the 0901 text** |
| same file | 109 | `'{ also broken'` → `.claude/settings.local.json` | ✗ no — not an arrow name |
| same file | **140** | `'{ broken'` → `.claude/settings.json` (case2, slug `sn-broken`) | ✅ **yes — a match for the 0901 text** |
| same file | 39-48 | a JSON allowlist → `.claude/settings.json` (case1, slug `sn-notice`) | ✅ yes — valid JSON |

### the dir source in `sessionstart.notify-permissions` — confirmed

every case builds its dir with `genTestDir`:

| line | slug |
|---|---|
| 37 | `sn-notice` |
| 84 | `sn-no-claude` |
| 106 | `sn-both-broken` |
| 138 | `sn-broken` |

`HERMETIC_ENV` (`:24`, `HOME: '/nonexistent-home'`) is passed only to `invokeHook` (`:54`, `:91`,
`:115`), never to `genTestDir`. so this suite has the same real-HOME link as `check-permissions`.

### which write did it

three `{ broken` writes land on the real file: `check-permissions:678`, `notify-permissions:108`,
`notify-permissions:140`. the timestamp alone cannot tell them apart. the last of these to run
before 08h48 on 0901 wins, and any later allowlist write would overwrite it. so the culprit is
**whichever of the three ran last**, with no allowlist write after it. a test log from that run
would name it. **unverified** — no log was read.

### the hazard is already known one repo over

`rhachet-roles-bhuild` `blackbox/.test/infra/setFileInRepo.integration.test.ts:7-11` records the
same clobber (*"a fixture write through it clobbered real settings"*) and guards it with
`setFileInRepo`, which refuses a write through a link that leaves the repo. `rhachet-roles-ehmpathy`
has no such guard.

---

## .what the clamp must bite on — for when the freeze lifts

not a fix. the defect's shape, so a clamp can be built red-first:

- **the trigger** — a box whose `$HOME/.claude/settings.json` exists. the clamp must create one in
  a **temp** HOME, or it stays green on CI the way the defect does (gap 1, the CI condition)
- **red** — run `genTestDir` + a fixture write to `.claude/settings.json` with a temp HOME that
  holds a sentinel settings file; assert the sentinel is unchanged. today it is overwritten
- **two placements** (from the prior report, unchanged): **a.** `rhachet-roles-ehmpathy` —
  `genTestDir` links under a temp HOME, fixture writes go through a guard like bhuild's
  `setFileInRepo`, plus a test that fails when HOME is real. **b.** rhachet — the arrow at
  `setBrainDirSettingsLayout.ts:134-138` is the root; whether a temp test repo should ever arrow to
  the real home is rhachet's call
