# research: where claude writes a local "always allow", and whether it follows a symlink

source: `@anthropic-ai/claude-code@2.1.280`, read via `rhx claude.cli.probe --into .temp/claude-cli.probe
--version 2.1.280` then `rhx claude.cli.strings` (2026-10-15). names below are the minified ones.

## .which file is the local layer

- `FIt("localSettings")` → `AK(cwd, canonicalGitRoot)`, then `.claude/settings.local.json` under it
- in the main checkout: `<cwd>/.claude/settings.local.json`
- in a worktree, when the main checkout's root, `.git`, and `.claude` are owned by the session's uid
  (`yEo`): canonicalized to `<main checkout>/.claude/settings.local.json` — the "consent store". the
  worktree's own `settings.local.json` is still READ as "legacy local settings" (`Epe`), merged under the
  canonical one, but writes go to the main checkout

## .how a settings write is made

`updateSettingsForSource` (the writer behind "always allow"):

```
let H = Ose(dirname(path));
await dr(path, json, { allowSymlink: source==="userSettings" || H,
                       checkParentDir: (source==="projectSettings"||source==="localSettings") && !H, … })
```

- `Ose(dir)` is true only when `dir` is claude's config dir (`$CLAUDE_CONFIG_DIR`, else `~/.claude`),
  compared by realpath(parent) + basename
- `dr` retries with `allowSymlink` only if `Mo(path)` — and `Mo` is hardwired `return !1`
- the atomic writer (`vv` / `Nvr`):
  - `allowSymlink`: one `readlink` hop, temp file beside the target, `rename` over the target — the link
    survives
  - no `allowSymlink` + `checkParentDir`: opens the parent with `O_NOFOLLOW|O_DIRECTORY`; a symlinked
    parent → `ELOOP` → throws `Refusing to write into symlinked directory`
  - no `allowSymlink`: an lstat that sees a symlink → throws `Refusing to write through symlink`

## .what that means for the split layout

| launch | local layer dir | `Ose` | outcome of an "always allow" write |
|---|---|---|---|
| plain `claude` at the repo root | `<repo>/.claude` (a symlink to the actor brain dir) | false | 🔴 refused: symlinked directory. true today, with or without the arrow |
| plain `claude` with `CLAUDE_CONFIG_DIR=<repo>/.claude` | `<repo>/.claude` | true | ✅ follows the arrow one hop, renames over `settings.of.repo.json`; arrow kept |
| enrolled clone (`CLAUDE_CONFIG_DIR=<actor brain dir>`) | `<repo>/.claude` | false (a different dir) | 🔴 refused, as for a plain claude |

## .re-read on 2.1.292 (the version the tests pin)

- the same guard: `allowSymlink: e==="userSettings"||M7(dir)`, `checkParentDir: (project||local) && !M7(dir)`.
  the retry hook `cs` still returns false
- `M7(dir)`: equal to the config dir by string, or by realpath(parent) + basename. so
  `CLAUDE_CONFIG_DIR=<repo>/.claude` passes, and the actor brain dir path (the enrolled config dir) does
  not, since `<repo>/.claude` and `…/brain/.claude` differ in their parent
- an allowed symlink write follows ONE `readlink` hop, then renames a temp file over that hop's target
- every "don't ask again" suggestion is built with `destination:"localSettings"`, hardcoded. no prompt
  option writes to the user layer (the grove)
- the only other lever is the cli flag `--project-config-root <abs dir>`, which a plain `claude` never
  passes

## .measured with a real claude (2.1.292, haiku)

`blackbox/cli/brain-config.grove-vs-repo.realbrain.acceptance.test.ts` [case2 t1], with the opt-in in
[case3] — the layout `rhx init` builds, a prompt that runs an unapproved probe, and the answer
`2. Yes, and don't ask again for: bash probe.sh`.

| launch | the command ran | `settings.of.repo.json` after | the arrow | the grove | what the human saw |
|---|---|---|---|---|---|
| plain `claude` at the repo root | ✅ | unchanged (`"allow": []`) | kept | unchanged | naught — no error, no notice. the grant lasts the session only |
| `CLAUDE_CONFIG_DIR=<repo>/.claude` | ✅ | `"allow": ["Bash(bash probe.sh)"]` | kept | unchanged | the normal flow |

⇒ the source read holds on every row. the refusal is **silent**.

## .the grove, by the same mechanism

an enrolled clone's user layer is `settings.json -> settings.of.grove.json -> ~/.claude/settings.json`,
two hops. a user-layer write (`/model`, `/config`) follows one hop and renames over
`settings.of.grove.json`, so the grove arrow becomes a real file and `~/.claude/settings.json` never
sees the change. a `settings.json` that pointed straight at `~/.claude/settings.json` (one hop) would let
the write land box-wide. the fork itself was measured 2026-09-28
(`define.brain-dir-layout-is-one-for-every-actor`); the one-hop cause is from the source.

## .open
- the read side is unaffected: settings reads follow symlinks, as the grove arrows already prove
