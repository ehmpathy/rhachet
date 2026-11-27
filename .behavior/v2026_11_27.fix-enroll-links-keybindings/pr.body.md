## what this builds

every actor's brain dir (the config dir a clone spawns with) now links the human's
`~/.claude/keybindings.json`, so a clone hints and honors the human's own submit key, as a bare
`claude` does.

```
keybindings.json -> .home/.claude/keybindings.json          # relative
.home/.claude/keybindings.json -> <home>/.claude/keybindings.json
```

- the link rides `setBrainDirSettingsLayout`, the one findsert every actor passes through
  (`enroll`, `init`, derive), beside the grove arrows
- no home file: no arrow, no output, exit as before
- idempotent: a re-run finds both arrows and changes naught
- a home file removed later: the next findsert removes both arrows
- a home file enroll cannot read (a link loop, a denied read, mode 000): no arrow, exit 0, and one
  line on stderr names the path and the fix:
  ```
  ℹ keybindings at <home>/.claude/keybindings.json could not be read (a link loop, or no read permission) — the clone keeps claude's default keys; fix the file, then enroll again
  ```
- git ignores both names, so no machine path is committed

## why it works

claude 2.1.332 reads `keybindings.json` from its config dir, and a clone's config dir is its
actor's brain dir. measured live: a haiku tui clone's debug log reads
`[keybindings] Loaded 2 user bindings from <brainDir>/keybindings.json`.

## proof

| tier | what | result |
|---|---|---|
| unit | `asBrainKeybindingsUnreadableLine`: the line's bytes | 1 passed |
| integration | `setBrainDirSettingsLayout` case10–case25: present, absent, re-run, removed, every odd shape at each name, a loop, a mode-000 file, a home `.claude` that is a file | 129 passed (5 suites) |
| integration | the repo actor, a derived actor, and the gitignore | green |
| acceptance | `enroll` [case2g] [t0]–[t5] under a pinned HOME, stderr snapped | green |
| live | `enroll.keybindings.realbrain` on claude 2.1.332, haiku (`rhx test.acceptance.brainlive --scope 'path://enroll.keybindings.realbrain'`) | 3 passed |

each clamp bites: the layout op reverted, 8 integration tests and the live load row go red; the
enroll print disabled, [t5] goes red; the read check removed, case25 goes red on a non-root host.

the live suite runs on its named flag, not in ci. a claude release that moves the config-dir read
would pass ci; rerun the live suite on an upgrade.

## for the commander

fulcrums, each a best guess with a clean rework, in
`.behavior/v2026_11_27.fix-enroll-links-keybindings/.fulcrums/`:

- F4 — the credfree `--what integration` mode and #846's `--what` refusal test (case4) ride byte
  for byte; #846's integration-run case5 stays with #846
- F5 — `setBrainDirSettingsLayout` keeps its name; its header widens to the keybindings arrows
- F6 — an unreadable home file reads as absent, with one stderr line
- F7 — foreign tree changes stay out of this pr (below)
- F8 — no pushback footnote: no prior decision is pushed back on
- F9 — the live proof asserts claude's load log; the hint render and a live reload stay claude's
- F10 — the live proof stays on `BRAIN_LIVE_SCOPE=all`, per `rule.require.live-brain-tests-run-on-a-named-flag`
- F11 — the unreadable line is snapped in tree mode only; it rides stderr, apart from the json on stdout
- F12 — the arrows are asserted by exact value, not snapped; `init` is proven at integration

out of this pr, left in the worktree untouched: `package.json`, `pnpm-lock.yaml`, `.gitattributes`,
and the regenerated `actor.via.repo=ambient` `settings.of.repo.json` and `hooks.dispatch.manifest`.

caught for later: whether claude's `/keybindings` writes through an arrow whose home file was
deleted (`.dream/v2026_11_27.fix.a-dead-keybindings-arrow-and-claudes-keybindings-command.md`).
