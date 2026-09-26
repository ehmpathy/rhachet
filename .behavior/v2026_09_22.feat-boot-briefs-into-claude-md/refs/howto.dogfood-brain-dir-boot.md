# howto.dogfood-brain-dir-boot

> this repo boots its own default roles through the brain dir that `rhx init` writes.
> route: `.behavior/v2026_09_22.feat-boot-briefs-into-claude-md`.

## .what is on disk

```
<repo>/.claude -> .agent/.actors/actor.via.slug=.default/brain/.claude   # relative symlink

.agent/.actors/actor.via.slug=.default/brain/.claude/
  CLAUDE.md -> AGENTS.md    # symlink — the engine-native, ungated door (tracked)
  AGENTS.md                 # one line: @boot.md (tracked)
  boot.md                   # the default roles, rendered — ~806 KB (ignored)
  settings.json             # hooks + permissions (tracked)
  .gitignore                # boot.md, *.local.json
```

the root `.gitignore` holds `.agent/.actors/*` plus the negation
`!.agent/.actors/actor.via.slug=.default/`, so git sees the default dir and no other actor dir.

## .regenerate boot.md

```sh
npm run prepare:rhachet    # or: npx rhx init · npx rhx upgrade · npx rhx roles link
```

each prints one census line per corpus it writes, e.g.
`boot.md (default): …/brain/.claude/boot.md — 21 roles, 805793 chars`, and re-renders every
active actor's brain dir beside the default one.

## .verify it landed

a quote is the proof; a file on disk is not. from the repo root, on a cli at or past the floor:

```sh
claude -p 'quote the line of rule.forbid.per-clone-config that begins "an ACTOR owns its config"' \
  --model 'claude-opus-5-5[1m]' --settings '{"disableAllHooks":true}' --tools ''
```

- disable the hooks: with them on, the SessionStart route.drive context pulls a `-p` session into
  route work, and the answer is lost
- do not reach for `--setting-sources user` to isolate: it also gates the project `CLAUDE.md`, so
  naught loads
- 🟡 the model must hold the corpus. this repo's default corpus is ~806k chars (~200k tokens), past
  haiku's 200k window: a bare haiku `-p` fails with `Prompt is too long`. use a 1M-context model

## .see also

- `define.brain-dir-repo-vs-actor` — the two brain dirs, and who writes which
- `define.claude-md-vs-system-prompt`
