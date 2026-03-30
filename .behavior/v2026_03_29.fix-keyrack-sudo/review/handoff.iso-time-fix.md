# handoff: fix iso-time package UTC bug

## the bug

**file**: `src/domain.operations/checks/isIsoTimeStamp.ts` (in iso-time repo)

```typescript
export const asIsoTimeStamp = (input: Date | string | number): IsoTimeStamp =>
  format(castInputToDate(input), "yyyy-MM-dd'T'HH:mm:ss'Z'") as IsoTimeStamp;
```

**problem**: `date-fns/format()` outputs **local time**, but the format string appends a literal `'Z'` suffix. The `'Z'` suffix in ISO 8601 means UTC, but the time is actually local time.

**consequence**: any user not in UTC timezone gets incorrect timestamps. a user in UTC-4:30 who calls `asIsoTimeStamp(new Date())` at 09:42 UTC gets `2026-03-30T05:12:25Z` — which claims to be UTC but is actually local time.

## reproduction

```typescript
import { asIsoTimeStamp } from 'iso-time';

// run this in any non-UTC timezone (e.g., America/New_York)
const now = new Date();
console.log('native toISOString:', now.toISOString());
console.log('asIsoTimeStamp:', asIsoTimeStamp(now));

// expected: both should show the same UTC time
// actual: asIsoTimeStamp shows local time with fake Z suffix
```

## the fix

**option 1**: use `toISOString()` and truncate milliseconds

```typescript
export const asIsoTimeStamp = (input: Date | string | number): IsoTimeStamp => {
  const date = castInputToDate(input);
  // toISOString() always outputs UTC with milliseconds: 2026-03-30T09:42:25.648Z
  // truncate to seconds for IsoTimeStamp format: 2026-03-30T09:42:25Z
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z') as IsoTimeStamp;
};
```

**option 2**: use `date-fns-tz` for explicit UTC format

```typescript
import { formatInTimeZone } from 'date-fns-tz';

export const asIsoTimeStamp = (input: Date | string | number): IsoTimeStamp =>
  formatInTimeZone(castInputToDate(input), 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'") as IsoTimeStamp;
```

**recommendation**: option 1 — no new dependency, native JS, always correct.

## test coverage needed

```typescript
describe('asIsoTimeStamp', () => {
  it('outputs UTC time regardless of local timezone', () => {
    const date = new Date('2026-03-30T09:42:25.648Z');
    const result = asIsoTimeStamp(date);
    expect(result).toEqual('2026-03-30T09:42:25Z');
  });

  it('matches native toISOString for any date', () => {
    const dates = [
      new Date(),
      new Date('2020-01-01T00:00:00Z'),
      new Date('2025-12-31T23:59:59Z'),
    ];
    for (const date of dates) {
      const result = asIsoTimeStamp(date);
      const expected = date.toISOString().replace(/\.\d{3}Z$/, 'Z');
      expect(result).toEqual(expected);
    }
  });
});
```

## also check

scan iso-time for other uses of `date-fns/format` that may have the same bug:
- `asIsoTimeDate` — uses `'yyyy-MM-dd'` format, no Z suffix, probably ok
- any other function that outputs timezone-aware strings

## release notes

```markdown
## [x.y.z] - fix: asIsoTimeStamp now outputs correct UTC time

**compat-break**: `asIsoTimeStamp()` now outputs UTC time instead of local time.

before (wrong): local time with fake 'Z' suffix
after (correct): actual UTC time with 'Z' suffix

if your code depended on the incorrect behavior, update accordingly.
```

## steps

1. clone iso-time repo
2. apply fix (option 1 recommended)
3. add test coverage
4. bump version (compat-break if callers depended on wrong behavior)
5. publish
6. update rhachet to use fixed version
