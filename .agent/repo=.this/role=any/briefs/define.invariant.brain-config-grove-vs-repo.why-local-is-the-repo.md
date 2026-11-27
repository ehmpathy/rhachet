# define.invariant.brain-config-grove-vs-repo.why-local-is-the-repo

a zoom of `define.invariant.brain-config-grove-vs-repo`: why the arrows run
`settings.json -> grove` and `settings.local.json -> repo`, and never the swap.

## .what

the repo sits in the high slot, the grove in the low one. claude's file names suggest the reverse —
`settings.json` reads as "shared", `settings.local.json` as "mine" — and the names lose to the ranks.

```
settings.json        -> settings.of.grove.json    low slot  → grove
settings.local.json  -> settings.of.repo.json     high slot → repo
```

## .kind

**nurture on a nature fact.** claude's ranks are a vendor fact (local > project > user, and
`--settings` above all). that the repo must outrank the grove is our choice — a repo session must
behave the same on every box. the wire-up follows from the two.

## .invariant

```
rank(repo) > rank(grove)   in every launch, plain or enrolled
⟹ the repo takes claude's higher-ranked name, whatever the name suggests
```

## .why — the swap breaks three things

| | the swap (`settings.json -> repo`, `settings.local.json -> grove`) | why it fails |
|---|---|---|
| **1. a plain claude** | local (grove) outranks project (repo) | a home key overrides the repo, so the session differs per box — the drift criterion (6) exists to stop. the grove also loads twice: user + local |
| **2. an enrolled clone** | its user slot (`CLAUDE_CONFIG_DIR/settings.json`) holds the repo, and `--settings` holds the repo again | the grove has no slot left. a second `--settings` replaces the first, never stacks; no layer ranks below user; and the `local` layer resolves from the cwd, so every clone, of any actor, would read the repo actor's dir |
| **3. "always allow"** | a plain claude writes `settings.local.json`, which now leads to the grove | the grant forks `settings.of.grove.json` and never reaches `settings.of.repo.json` |

## .scope

- covers every actor's brain dir (`define.brain-dir-layout-is-one-for-every-actor`)
- rests on claude-code's layer ranks, measured on 2.1.292

## .the litigation

the case for the swap: it matches claude's own sense of the names — `settings.json` a team file,
`settings.local.json` a personal override. the case against, which settles it: the rank table above.
claude ranks personal over shared, and this layout needs shared (the repo) over personal (the grove).
claude's fixed names mislead about what each slot holds here, which is why the clear names
`settings.of.repo.json` and `settings.of.grove.json` exist beside them.

## .the counter-argument

a reader who opens `<repo>/.claude/settings.json` expects the repo's settings and finds the grove. the
surprise is real.

the answer: the surprise costs one read, and the clear name it points at says what it holds. the swap
costs a repo that behaves differently per box and a clone with no grove, both silent.

## .what would overturn it

a claude-code release that lets a launch choose its layer ranks, or that stacks two `--settings`, so
the repo could take `settings.json` and still outrank the grove.

## .enforcement

- `settings.json` pointed at the repo, or `settings.local.json` at the grove = **blocker**
- a design where a home key outranks a repo key in any launch = **blocker**

## .see also

- `define.invariant.brain-config-grove-vs-repo` — the root
- `define.brain-dir-layout-is-one-for-every-actor` — the rank table for a clone
