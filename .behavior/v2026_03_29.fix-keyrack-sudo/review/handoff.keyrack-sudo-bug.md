# handoff: keyrack sudo key bug

## root cause identified

**bug location**: `iso-time` package, `asIsoTimeStamp()` function

**file**: `node_modules/iso-time/dist/domain.operations/checks/isIsoTimeStamp.js`

```javascript
const asIsoTimeStamp = (input) => format(castInputToDate(input), "yyyy-MM-dd'T'HH:mm:ss'Z'");
```

**problem**: `date-fns/format()` outputs **local time**, but the format string appends a literal `'Z'` suffix. The `'Z'` suffix means UTC, but the time is actually local time. This produces an incorrect ISO timestamp for any user not in UTC timezone.

## evidence from debug output

```
[debug:unlock] TTL calculation:
  nowMs: 1774863745648
  nowIso: 2026-03-30T09:42:25.648Z        ← correct UTC (from toISOString())
  effectiveDurationMs: 1800000 (30m)
  expiresAt: 2026-03-30T05:12:25Z         ← WRONG: local time with fake Z suffix
  expiresAtDate.getTime(): 1774865545648
  verify (expiresAt - now): 1800000ms (30m)  ← numeric calculation is correct
```

user confirmed: local time + 30m = 05:12:25 (timezone offset is -270 minutes / UTC-4:30)

## why status shows "no keys unlocked"

1. `unlockKeyrackKeys()` calculates `expiresAt` via `asIsoTimeStamp()`
2. the grant is sent to daemon with incorrect (past) `expiresAt`
3. daemon stores the grant
4. when `status` calls `entries()`, it compares:
   - `now = new Date().toISOString()` = correct UTC time (09:42)
   - `cachedGrant.expiresAt` = fake UTC time (05:12)
5. since `09:42 >= 05:12`, the key is considered expired and purged
6. status returns empty array

## the fix

replace `asIsoTimeStamp()` with correct UTC format.

**option 1**: use native `toISOString()` and truncate milliseconds
```typescript
const expiresAt = expiresAtDate.toISOString().replace(/\.\d{3}Z$/, 'Z') as IsoTimeStamp;
```

**option 2**: fix `iso-time` package to use `formatInTimeZone` from `date-fns-tz`

**option 3**: use `date-fns-tz` directly in rhachet

## files with debug logs added

- `src/domain.operations/keyrack/session/unlockKeyrackKeys.ts` (TTL calculation)
- `src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore.ts` (set/entries)
- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/handleUnlockCommand.ts` (IPC receive)

run with `DEBUG=keyrack ./bin/rhx keyrack unlock ...` to see logs.

## test coverage needed

- unit test: verify `expiresAt` is always in UTC
- integration test: unlock + status roundtrip in non-UTC timezone
- acceptance test: sudo key unlock → get → returns granted

## next steps

1. fix `asIsoTimeStamp()` call in `unlockKeyrackKeys.ts`
2. run tests to verify fix
3. consider issue on `iso-time` package
4. remove debug logs before merge
