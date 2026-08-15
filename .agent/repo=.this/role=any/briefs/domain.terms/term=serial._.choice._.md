# domain.term: serial

term.chosen   = serial
term.kind     = noun            # a domain-object field (dobj attribute): [...noun][state]?
term.synonyms.forbidden:
- session-id
- clone-id
- instance-id
- uuid

## .what

a **serial** is a **clone**'s primary ref — one uuid per clone, minted by `genCloneSerial`, the
`RefByPrimary` of the `Clone` entity. it answers "which clone?". distinct from **series** (the
clone's continuity — its `BrainSeries` of episodes): one serial OWNS one series that accretes over
time. a clone is addressed by `@:<serial>` (the marked clone grain), or by its optional `--as`
`slug` (`RefByUnique`); both point at the same clone. the serial is rhachet's handle; the brain-cli's
own handle is the `exid` (the resume target).

## .refs

- .agent/repo=.this/role=any/briefs/define.actor-clone-hierarchy.md   (serial = the clone's primary ref; serial vs series)
- .agent/repo=.this/role=any/briefs/define.address-sigils.md          (@:<serial> ≡ clone://<serial>)
- src/domain.operations/clone/genCloneSerial.ts                       (mints the serial)

## .reason

see the ref-level cluster beside this choice:
- `term=serial._.choice.reason.md` — etymology, the serial-vs-series axis, why not session-id/clone-id
