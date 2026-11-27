# rule.forbid.unit-suffixed-time-fields

> **a time field never carries its unit in its name. the unit lives in the type: `IsoTimeStamp`
> for a moment, `IsoDuration` for a span.**

```ts
👎  ttlLeftMs: number | null;       // the unit is a word a compiler cannot read
👎  timeoutSeconds: number;
👍  expiresAt: IsoTimeStamp | null; // a moment
👍  expiresIn: IsoDuration | null;  // a span — JSON-native as { minutes: 30 }
```

a specialization of `rule.forbid.any-time` (mechanic). that rule forbids a time as a number; its
readers look past it at a **wire** boundary, because its examples are all domain objects and its
raw-ms exception reads like a socket hand-off. this rule names the tell a reader can see on the
page: **a unit suffix is the type absent from its shape.**

## .the test

> **does the field's name end in a unit — `Ms`, `Sec`, `Seconds`, `Mins`, `Minutes`, `Hours`,
> `Days`?**

yes → the type is wrong. reshape to `IsoTimeStamp` or `IsoDuration`, and read a number with
`toMilliseconds` only at the one call that needs it.

| when… | then… |
|---|---|
| a field crosses a socket, a file, or a cli `--json` | 🔴 the sharpest cue. JSON carries an `IsoDuration` as-is; the codec never forces a number |
| you carry an extant `*Ms` field onto a type you reshape | the field is yours now. reshape it with the type |
| a render needs `Nm` | `toMilliseconds(expiresIn)` at the render, never a number on the wire |
| an api (`setTimeout`, `setInterval`) takes ms | convert at the call, from an `IsoDuration` held upstream |

## .the boundary

| a violation | not a violation |
|---|---|
| a field or input named `*Ms` / `*Seconds` / … on a domain object, a wire type, a contract, or a `--json` shape | a local `const` that feeds a raw-ms api on the next line |
| a duration as `number` under any name | an env var whose value is a raw count (`KEYRACK_DAEMON_RENEW_TICK_MS`) — cast it to `IsoDuration` where it is read |

blocker: a unit-suffixed time field added to, or carried across onto, any shape · a duration
typed `number` on a wire or contract.
nitpick: an internal context input named `*Ms` that a timer api consumes.

⇒ see also: `rule.forbid.any-time` (mechanic, the parent) · `term=row._.choice.reason.md` (the
`ttlLeftMs` lie it already recorded) ·
`.behavior/v2026_11_14.fix-keyrack-sso-self-renew/review/reflection.of=commander-review.case=r4696241582-unit-suffixed-time-field.md`
(the 7 whys that found it).
