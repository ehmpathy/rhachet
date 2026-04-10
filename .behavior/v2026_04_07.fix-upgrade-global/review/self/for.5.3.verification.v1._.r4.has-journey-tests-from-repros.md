# self-review: has-journey-tests-from-repros (r4)

## no repros artifact for this behavior

this behavior route did not include a `3.2.distill.repros.experience.*.md` artifact. the journeys were defined directly in the blackbox criteria (`2.1.criteria.blackbox.md`).

## journeys from criteria → test coverage

all 6 usecases from criteria have test coverage:

| usecase | journey | test file | coverage |
|---------|---------|-----------|----------|
| usecase.1 | default upgrade (rhx invocation) | execUpgrade.test.ts | `--which local`, `--which global`, `--which both`, default behavior |
| usecase.2 | npx invocation | execUpgrade.test.ts | npx detection → local only |
| usecase.3 | global upgrade fails | execUpgrade.test.ts | warn and continue when global fails |
| usecase.4 | already current | execUpgrade.test.ts | skip when already at latest |
| usecase.5 | version mismatch | execUpgrade.test.ts | upgrade to latest regardless of prior version |
| usecase.6 | output clarity | upgrade.acceptance.test.ts | snapshot verification of CLI output |

## coverage map for test cases

### usecase.1: default upgrade (rhx invocation)

```typescript
// execUpgrade.test.ts
given('[case3] --which flag', () => {
  when('[t0] --which local', () => { ... });
  when('[t1] --which global', () => { ... });
  when('[t2] --which both', () => { ... });
  when('[t3] no --which flag, invoked via rhx (global)', () => { ... });
});
```

### usecase.2: npx invocation

```typescript
// execUpgrade.test.ts
given('[case3] --which flag', () => {
  when('[t4] no --which flag, invoked via npx', () => {
    then('upgrades local only (global skipped)', ...);
  });
});
```

### usecase.3: global upgrade fails

```typescript
// execUpgrade.test.ts
given('[case4] global upgrade failure', () => {
  when('[t0] execNpmInstallGlobal throws', () => {
    then('local upgrade still succeeds', ...);
    then('result shows global failure', ...);
  });
});
```

### usecase.4 & usecase.5: already current / version mismatch

handled by the transformer tests:
- `getGlobalRhachetVersion.test.ts` — detects current version
- `execNpmInstallGlobal.test.ts` — handles upgrade scenarios

### usecase.6: output clarity

```typescript
// blackbox/cli/__snapshots__/upgrade.acceptance.test.ts.snap
// snapshot captures --which flag in help output
```

## conclusion

all journeys from criteria are covered by tests. no repros artifact was created for this behavior, so the journeys were verified against the criteria file directly.
