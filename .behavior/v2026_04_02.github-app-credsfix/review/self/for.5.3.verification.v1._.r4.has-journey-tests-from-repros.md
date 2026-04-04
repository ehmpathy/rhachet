# review: has-journey-tests-from-repros (r4)

## verdict: pass — no repros artifact exists, journey derived from wish

## question: did you implement each journey sketched in repros?

### check for repros artifact

```bash
ls -la .behavior/v2026_04_02.github-app-credsfix/3.2.distill.repros.*.md
```

result: no such files exist

### route structure

this route does not have a `3.2.distill.repros.experience` phase. the route went:

1. `0.wish.md` — contains repro steps directly
2. `1.vision.md` — describes before/after behavior
3. `2.1.criteria.blackbox.md` — usecases derived from wish
4. `3.1.3.research.internal` — code analysis
5. `3.3.1.blueprint.product` — implementation plan
6. `4.1.roadmap` — execution plan
7. `5.1.execution` — implementation
8. `5.3.verification` — verification (current)

### why no repros phase

the wish (`0.wish.md`) already contains complete repro steps:

```
jq -n --rawfile key ~/Downloads/beaver-by-bhuild.2026-03-31.private-key.pem \
    '{appId: "3234162", privateKey: $key, installationId: "120377098"}' | \
  npx rhachet keyrack set ...
```

the repro is embedded in the wish itself. no separate distillation was needed.

### journey test coverage

the journey from the wish is covered by `[case5]` in the acceptance test:

| wish step | test coverage |
|-----------|---------------|
| construct multiline json with `jq` | `JSON.stringify({...}, null, 2)` |
| pipe to `keyrack set` | `stdin: multilineJson` in test |
| run `keyrack unlock` | `invokeRhachetCliBinary({args: ['keyrack', 'unlock', ...]})` |
| run `keyrack get --allow-dangerous --json` | `invokeRhachetCliBinary({args: ['keyrack', 'get', ..., '--allow-dangerous', '--json']})` |
| verify secret field contains exact json | `expect(parsed.grant.key.secret).toEqual(multilineJson)` |

### BDD structure verification

the test uses BDD given/when/then:

```typescript
given('[case5] multiline json via stdin', () => {
  when('[t0] set with multiline json piped via stdin', () => {
    then('set exits with status 0', ...);
    then('set output contains configured key', ...);
  });
  when('[t1] unlock and get the key', () => {
    then('get exits with status 0', ...);
    then('secret matches exact input (round-trip)', ...);
    then('secret is parseable json with all fields', ...);
  });
});
```

## conclusion

no repros artifact exists because the wish contains the repro directly. the journey from the wish is fully covered by `[case5]` in the acceptance test.
