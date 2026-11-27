# reflection: why a `ttlLeftMs: number` shipped beside `expiresAt: IsoTimeStamp`

the commander had to point at `DaemonStatusKey.ttlLeftMs: number | null` and ask for
`expiresIn: IsoDuration | null`. the fix landed (`expiresIn`, read via `toMilliseconds` at the
one render that needs a number). this is the root of why it was needed at all.

## .the 7 whys

1. **why did the pr ship `ttlLeftMs: number`?**
   the field sat on main's `DaemonStatusRow`. this pr reshaped that type (renamed it, added
   `renewal`) and carried the field across unchanged.

2. **why was it carried rather than reshaped?**
   it was graded "main's, no churn". but the type was already in the diff; a field on a type the
   pr rewrites is the pr's to fix. the no-churn bound covers lines the pr does not touch, never
   fields of a shape it reshapes.

3. **why did no rule fire at the keyboard?**
   `rule.forbid.any-time` (mechanic) forbids a duration as a number. it also sanctions
   `toMilliseconds` "only to hand a raw-ms api". a `*Ms` field reads like that raw-ms hand-off,
   so the forbid read as satisfied.

4. **why did a wire field read as a raw-ms api?**
   the socket is JSON, and the `row` term framed the wire as "whatever JSON can carry". a codec
   limit was taken as license for a primitive. but an `IsoDuration` (`{ minutes: 30 }`) is
   JSON-native; the codec never forced a number.

5. **why was that frame believed?**
   the word `row` set the wire apart as a lesser shape than the domain object. a vocabulary that
   names a boundary as "lesser" invites a lower bar there.

6. **why did the reviews not catch it?**
   each rubric grades the lines a diff adds. the field name was extant, so no added line held
   it; and no rubric reads a field NAME for a unit.

7. **why does no rule read the name?**
   `any-time` is a rule about the TYPE. its every example is a domain object. no rule states the
   name-level tell: **a unit suffix on a field is the type absent from its shape.** `ttlLeftMs`
   says "milliseconds" in the one place a type cannot check.

## .the root

`rule.forbid.any-time` is correct, and its readers look past it at a wire boundary, because its
examples are all domain objects and its raw-ms exception reads like a wire hand-off. the defect
recurs wherever a unit lives in a name instead of a type.

## .the clamps

| clamp | where |
|---|---|
| a unit suffix on a time field is forbidden, at every boundary a shape crosses | `.agent/repo=.this/role=any/briefs/rule.forbid.unit-suffixed-time-fields.md` |
| `row`, `mark`, `cap` are forbidden terms; `row` lost its dispute to `key` | `.agent/repo=.this/role=any/briefs/rule.forbid.term-row-mark-cap.md`, `term=row._.choice.reason.md` |
| the same specialization, owed upstream to the rule's owner | caught dream `.dream/v2026_11_25.reseed.forbid-unit-suffixed-time-fields-upstream.md` |
| internal `*Ms` inputs that remain (`windowMs`, `renewTimeoutMs`, `timeoutMs`) | caught dream `.dream/v2026_11_25.fix.renew-tick-durations-as-iso-duration.md` |
