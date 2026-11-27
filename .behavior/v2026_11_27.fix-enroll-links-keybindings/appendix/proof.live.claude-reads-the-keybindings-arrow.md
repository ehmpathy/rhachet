# proof.live: a real claude clone reads the human's keybindings through the arrow

measured 2026-11-27, claude-code 2.1.332, this worktree, the box's own `~/.claude/keybindings.json`.

## .command

```sh
npx rhx enroll claude --as @:kbprobe --roles -driver --async --model haiku --debug-file .temp/kb.probe.tui.debug.log
rhx grepsafe --pattern '\[keybindings\]' --path .temp/kb.probe.tui.debug.log --output pipeable
npx rhx clone say @:kbprobe --what '/exit'
```

## .output

```
[DEBUG] [keybindings] Loaded 3 user bindings from <worktree>/.agent/.actors/actor.via.hash=2e77f741/brain/.claude/keybindings.json
[DEBUG] [keybindings] KeybindingSetup initialized with 235 bindings, 0 warnings
[DEBUG] [keybindings] Watching for changes to <worktree>/.agent/.actors/actor.via.hash=2e77f741/brain/.claude/keybindings.json
```

## .what it proves

- claude reads `keybindings.json` from its config dir: the clone's brain dir, via the arrow
- the human's 3 bindings load, with 0 warnings
- claude watches the linked path for edits (a proxy: no run here edits the home file live)

## .bound

a print clone (`-p`) loads no keybindings at all (same box, same run: no `[keybindings]` line). the
proof needs an interactive pane, which is the only place a submit hint shows.
