# pr title

feat(enroll): enroll a role at a subject focus, as `role::subject`

# pr body

closes ehmpathy/rhachet#639

## .what

`--roles` on `enroll` and `init` accepts `<role>::<subject>`, in the exact form and the delta
form:

```sh
rhx enroll claude --roles any,director,mechanic::flow
rhx enroll claude --roles +mechanic::flow
rhx init --roles +mechanic::code.prod
```

a focused role boots only that subject's briefs and skills, and keeps every one of the role's
hooks. hooks follow the role; briefs follow the focus.

## .why

a director seat drops mechanic to fit its boot budget, and loses mechanic's safety hooks with it.
a focus keeps the rails and a small set of briefs, without the whole role.

## .changes

- **the token** — `role::subject` parses in every `--roles` form. a subtraction with a focus
  (`-mechanic::flow`) and a role named whole and focused in one call refuse, each with the move
  that does exist. two foci of one role union
- **the delta** — `+role::subject` upserts the role's one entry: it narrows a whole role, moves a
  held focus, and `+role` widens it back
- **the render** — `boot.md` holds the focus's briefs and skills, plus a one-line note of the
  scope it was given. an unfocused role boots exactly as before
- **`always` opt-out** — a subject may declare `inherit: { always: false }`, so a small focus
  does not carry the role's whole `always` block
- **the cost** — `roles cost --all` prices each declared subject as its own row under its spec,
  checked against the spec's cap
- **the refusals** — an undeclared subject fails loud and names the declared ones, before init
  writes a byte. `upgrade --roles mechanic::flow` refuses (a package has no focus)
- **the receipt** — enroll and init print a `🧢 focus` block: each focus given, narrowed, moved,
  widened, or held, and each role that sheds `always`
- **init's ambient focus** — recorded in `actor.via.repo=ambient/roles.foci.json`; a corrupt
  record refuses with its repair, and is never overwritten
- **found en route** — `init --hooks claude-code` (the alias) now opens the settings shield as
  `anthropic/claude/code` does; before, the adapter could write through the grove arrow

## .bounds

no change to how a role with no focus boots.

## .verification

- types, unit (536 suites / 4289 tests) and the touched acceptance suites green; each new
  snapshot verified on an independent run
- integration tier: <result once `rhx keyrack unlock --owner ehmpath --env test` lands>

## .followups

- the 1.vision peer reviewers were moved off the openrouter host that returned 400; retire that
  move once rhachet-ktlo's cure for the openrouter 400 ships, so the reviewers return to their
  declared host
- fulcrums F1–F9 (`.fulcrums/inventory.of=fulcrums._.md`) await the council's verdict; each is a
  clean rework

🤖 Generated with [Claude Code](https://claude.com/claude-code)
