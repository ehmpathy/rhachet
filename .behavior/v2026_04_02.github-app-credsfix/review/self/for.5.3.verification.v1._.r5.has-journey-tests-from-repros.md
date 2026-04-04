# review: has-journey-tests-from-repros (r5)

## verdict: pass — journey from wish is fully covered by [case5]

## question: did you implement each journey sketched in repros?

### repros artifact check

no `3.2.distill.repros.experience.*.md` file exists in this route. the wish (`0.wish.md`) contains the repro directly.

### the wish journey (from 0.wish.md)

```bash
# step 1: construct multiline json with jq
jq -n --rawfile key ~/Downloads/beaver-by-bhuild.2026-03-31.private-key.pem \
    '{appId: "3234162", privateKey: $key, installationId: "120377098"}'

# step 2: pipe to keyrack set
  | npx rhachet keyrack set \
    --key EHMPATH_BEAVER_GITHUB_TOKEN \
    --env prep \
    --vault os.secure \
    --owner ehmpath \
    --mech EPHEMERAL_VIA_GITHUB_APP

# step 3: unlock the key
rhx keyrack unlock --key ehmpathy.prep.EHMPATH_BEAVER_GITHUB_TOKEN --env prep --owner ehmpath

# step 4: get the key and verify
rhx keyrack get --key ehmpathy.prep.EHMPATH_BEAVER_GITHUB_TOKEN --owner ehmpath --allow-dangerous --json
```

### test coverage map

| wish step | test line | test code |
|-----------|-----------|-----------|
| construct multiline json | 296-305 | `JSON.stringify({appId: '3234162', privateKey: '-----BEGIN RSA...'}, null, 2)` |
| pipe to keyrack set | 308-327 | `invokeRhachetCliBinary({args: ['keyrack', 'set', ...], stdin: multilineJson})` |
| unlock the key | 341-354 | `invokeRhachetCliBinary({args: ['keyrack', 'unlock', ...]})` |
| get and verify | 356-388 | `invokeRhachetCliBinary({args: ['keyrack', 'get', ..., '--allow-dangerous', '--json']})` |

### BDD structure verification

the test follows given/when/then:

```typescript
given('[case5] multiline json via stdin', () => {          // line 290
  when('[t0] set with multiline json piped via stdin', () => {  // line 307
    then('set exits with status 0', ...);                   // line 329
    then('set output contains configured key', ...);        // line 333
  });
  when('[t1] unlock and get the key', () => {               // line 339
    then('get exits with status 0', ...);                   // line 373
    then('secret matches exact input (round-trip)', ...);   // line 377
    then('secret is parseable json with all fields', ...);  // line 382
  });
});
```

### assertion verification

the test asserts the exact bug fix:

| assertion | line | purpose |
|-----------|------|---------|
| `expect(setResult.status).toEqual(0)` | 330 | set succeeded |
| `expect(parsed.slug).toEqual('testorg.test.MULTILINE_JSON_KEY')` | 335 | correct key registered |
| `expect(getResult.status).toEqual(0)` | 374 | get succeeded |
| `expect(parsed.grant.key.secret).toEqual(multilineJson)` | 379 | **round-trip exact match** |
| `expect(secret.appId).toEqual('3234162')` | 385 | json parseable |
| `expect(secret.privateKey).toContain('BEGIN RSA')` | 386 | RSA key preserved |
| `expect(secret.installationId).toEqual('120377098')` | 387 | all fields intact |

the key assertion is line 379: `expect(parsed.grant.key.secret).toEqual(multilineJson)` — this proves the bug is fixed.

### why this holds

the test mirrors the wish step-by-step:
1. constructs multiline JSON with embedded newlines (line 296-305)
2. pipes to keyrack set (line 308-327)
3. unlocks (line 341-354)
4. gets with --allow-dangerous --json (line 356-371)
5. asserts exact round-trip (line 379)

the wish showed `"secret": "{"` (truncated). the test asserts `secret === multilineJson` (full content). if the bug existed, the test would fail.

## conclusion

the journey from the wish is fully implemented in `[case5]`:
- every step mapped to test code
- BDD given/when/then structure used
- `[t0]` covers set, `[t1]` covers unlock+get
- assertions verify exact round-trip
