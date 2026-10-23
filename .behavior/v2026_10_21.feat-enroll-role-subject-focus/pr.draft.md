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

- types, unit and the touched acceptance suites green; each new
  snapshot verified on an independent run
- integration tier, impacted sweep with the test keyrack unlocked: 2124 passed, 13 failed, all in
  code this pr does not otherwise touch (`5.3.verification.yield.md` `.blockers`):
  - 3 fixed: the keyrack unlock ttl tests read the ttl left after a slow unlock returned; they now
    bracket the call (scoped rerun 17/17)
  - 6 behind an sso credential wall: `aws configure export-credentials` hangs past its 10s bound
    on the local box. escalated, not skipped; ci is their proof
  - 4 on host load, red on a scoped rerun too: the clone socket's `ss -xp` peer read outran its 5s
    bound, and a cold daemon spawn outran its 20s budget. neither guard was loosened; ci is their
    proof
- the perf acceptance suites (`roles.cost.performance.*`, ci only) missed their 250ms cap on the
  local box, where the unchanged `run --skill` baseline also ran at ~430ms against its ~36ms
  norm; ci measures them on a clean box

## .followups

- **this pr ships the mechanism, not the `101` focus.** `mechanic::101` runs once `subject.101`
  lands in rhachet-roles-ehmpathy's mechanic `boot.yml` (that tree's work); the demos here use
  `flow`
- **questions for the commander** — vision calls this build made, now asked rather than assumed.
  the build holds the lean, and each other option is a clean rework:
  - **Q1b** — does "the boot-budget check counts the subject" mean a NEW gate on a seat's
    `boot.md`? a. no: `roles boot --subject` is gated and `roles cost --all` prices each focus ·
    b. yes: gate each seat's whole `boot.md` at enroll. lean a — a seat gate needs a seat budget,
    which no contract declares yet
  - **F1–F7** — the subtract, mixed-set, `inherit` key, cost-row, stale-focus, `+` upsert and
    upgrade calls, each with options and a lean in `.fulcrums/inventory.of=fulcrums._.md`
    `.questions for the commander`
  - which briefs belong in `101` — the commander's call
  - whether mechanic should move its `always` into plain subjects instead of the
    `inherit: { always: false }` key
- conceded and open, each a clean add on this mechanism: a seat-level price (what one seat's
  whole `boot.md` costs), a `role=` attribute on the `<focus>` line, and Q1b from the vision
- conceded `better` in review and open, each a catalog row in `1.vision.experience.case=_.md`:
  - **T2** — `init --roles +role::subject` without `--prep` is undone by the next local install
    that replays an exact set; the narrow's receipt should name `--prep`
  - **Q1** — enroll refuses a repo-qualified focus (`ehmpathy/mechanic::flow`) as it refuses a
    qualified whole role today; init accepts it. the refusal should point to the bare form
  - **N1** — `enroll --as @:<slug>` with a new focus mints a new actor (the focus is identity), so
    the slug refuses as claimed, after the focus receipt prints. the hint should say so
  - **N2** — `--output json` carries no roles or focus field; `rhx actor list` reads the last
    bare enroll's manifest, not the ambient record
  - **U1 on a live actor** — the halt is proven at integration grain, not against a live clone;
    the hint should lead with "end its live clones" when it names an actor
    (`.dream/2026_10_22.test.focus-survives-a-live-actor-resync-at-command-level.dream.md`)
- the host path enroll writes into the tracked repo-actor settings (`claudeMdExcludes`) is kept
  out of this pr; its fix is owed in its own pr
  (`.dream/2026_10_22.fix.enroll-writes-a-host-path-into-the-tracked-repo-actor-settings.dream.md`)
- `RoleFocusResolved` — derive one focus per command at one choke point (F10, the dream
  `a-focus-parses-once-into-a-domain-literal`); today each role sink strips the focus itself
- ride-alongs, apart from the feature: the `isBrainClaudeCode` shield fix above, the jest
  `.agent/.actors/` ignore, the `test.acceptance.credfree` skill, and the `permissions.get`
  allowlist lines
- the role packages rode up to their current versions (bhrain 0.42.1, bhuild 0.23.3, ehmpathy
  1.39.7), which the reviewers of this route run on; the repo actor's tracked settings re-sorted
  with them. two extant test expectations move with that bump, and each asserts what the new
  version ships:
  - `invokeInit.integration.test.ts` [case2][t0] flips `settings.of.repo.json` from
    `not.toContain('"permissions"')` to `toContain`: ehmpathy 1.39.7 carries #895, whose
    `init.claude.permissions.sh` writes the permission allows into `settings.of.repo.json` by
    name on the split layout (lines 53–54). the old negative recorded that wait; the wait is over
  - `defaultPeerReviewerBrain.integration.test.ts` reads bhrain's renamed export
    (`brain/BRAIN_DEFAULT_OF_REVIEW`) and asserts the same value, `openrouter/deepseek/flash`
- the 1.vision peer reviewers were moved off the openrouter host that returned 400; retire that
  move once rhachet-ktlo's cure for the openrouter 400 ships, so the reviewers return to their
  declared host
- execution fulcrums F8–F10 (`.fulcrums/inventory.of=fulcrums._.md`) await the council's verdict;
  F10 alone is a dirty rework (it re-types roleset contracts)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
