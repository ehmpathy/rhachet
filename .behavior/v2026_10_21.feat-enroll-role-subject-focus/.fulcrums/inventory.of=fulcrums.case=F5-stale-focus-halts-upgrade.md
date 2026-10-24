# F5 — a stale focus halts the re-render, rather than skip that actor

- **the fork:** when an upgrade drops a subject an extant actor is focused on, (a) halt the
  re-render with exit 2 and name the actor; (b) warn, leave that actor's boot.md as it was, and
  re-render the rest; (c) fall back to the whole role
- **taken:** (a). (c) re-inflates the seat the commander narrowed, and a seat that boots 65.1k
  where it booted a few k is the exact surprise this wish undoes. (b) leaves a boot.md that cites
  briefs the new package may have moved, so a clone reads stale paths with no signal
- **rework:** clean. one branch at the re-render. (b) is a softer policy that could replace it
  if a halt on `rhx upgrade` proves too blunt in practice
- **confidence:** 65%. a halt blocks every other actor's re-render on one stale seat, which a
  commander may find heavy
- **the repo's own focus, too:** where the stale focus is the repo's (`init --roles
  mechanic::101`), `prepare:rhachet` replays it on the next install and refuses, so `pnpm
  install` fails. deps are pinned, so that failure lands on the role-bump pr, loud, where the fix
  (`rhx init --prep --roles +mechanic::<declared>` — `--prep`, as only it rewrites the replay) is
  named in the refusal; proven by `init.focus` `[case6]`. accepted under (a); it is
  the same halt, one call earlier
- **the fix the halt names:** a recorded focus gets its own hint (`assertRoleFocusDeclared`,
  `focusFrom: 'recorded'`): end the actor's live clones, or re-point the repo record. a re-enroll
  alone mints a new actor and clears naught while the old one's clones live
- **where:** `1.vision.experience.case=_.md` U1 · `case=4` `[t3]`
- **verdict:** —
