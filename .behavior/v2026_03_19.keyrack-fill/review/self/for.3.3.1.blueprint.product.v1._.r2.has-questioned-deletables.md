# self-review r2: has-questioned-deletables (deeper)

## re-examination with fresh eyes

i pause. take a breath. read the blueprint again line by line as if for the first time.

### examined: the FillKeyResult type itself

```ts
type FillKeyResult = {
  slug: string;
  owner: string;
  status: 'set' | 'skipped' | 'failed';
};
```

can this type be deleted?

without it: we'd have no structured way to track per-key-per-owner results. the summary computation depends on it. the return type depends on it.

but wait — do callers even use the results array? let me think about the usecases:
- CLI prints summary then exits
- tests verify behavior happened

for CLI: we could just print and exit(0) or exit(1). no return value needed.
for tests: we need to verify which keys were set vs skipped vs failed.

**verdict: holds.** tests need structured results for assertions.

### examined: the return type entirely

```ts
Promise<{
  results: FillKeyResult[];
  summary: { set: number; skipped: number; failed: number };
}>
```

can fillKeyrackKeys just return void?

for CLI: yes, it prints output and exits.
for tests: no, tests need to verify outcomes.

**alternative considered:** throw on failure instead of return { status: 'failed' }.

but: partial success is valid (some keys succeed, some fail). we need to report both. exception model doesn't fit.

**verdict: holds.** return type enables test assertions on partial success scenarios.

### examined: the `--env all` option

the vision and criteria allow `--env all` to fill both test and prod.

can this be removed for v1?

**considered:** most usecases are single-env. `--env all` is power-user feature.

**verdict: keep.** already in criteria. low implementation cost (just union the slugs from both envs). removes friction for users who want full setup.

### examined: the inner loop structure (owners inside keys)

```
for each key:
  for each owner:
    set, unlock, get
```

could we invert to keys-inside-owners?

```
for each owner:
  for each key:
    set, unlock, get
```

the vision explicitly says inner loop on owners so user can repeat same action for same key across owners before next key.

**example:** user enters CLOUDFLARE_API_TOKEN value, then enters it again for second owner. they can paste from clipboard twice in a row. then move to next key.

if we invert: user enters all keys for owner1, then all keys for owner2. they'd need to remember/retrieve each value twice with different keys between.

**verdict: holds.** the wish explicitly requires inner loop on owners for ergonomics.

### examined: the warn when vault inferred

```ts
if (!keySpec?.vault) {
  console.log(`      warn: vault inferred as ${vault}`);
}
```

can this be deleted? is it noise?

**verdict: holds.** the premortem reflection identified "vault inference may surprise" as a risk. the warn is the mitigation. to remove it would restore the risk.

### examined: the progressline output

```ts
console.log(`\n🔑 key ${idx + 1}/${slugs.length}, ${keyName}`);
```

can the progress indicator be simplified?

**alternative:** just `console.log(keyName)` without index.

**verdict: simplify.** the index/total is useful for large manifests, but most manifests have 3-10 keys. a simpler format:

```ts
console.log(`\n🔑 ${keyName}`);
```

user can see keys scroll by. no need to count.

**fix applied:** will update blueprint to remove index/total from progress output.

### examined: the "already set" check placement

```ts
const hostManifest = await daoKeyrackHostManifest.get(hostContext);
const keyHost = hostManifest.hosts[slug];

if (keyHost && !input.refresh) {
  console.log(`      ✓ already set, skip`);
  results.push({ slug, owner, status: 'skipped' });
  continue;
}
```

can this be deleted?

without it: we'd re-prompt for every key even if already configured.

**verdict: holds.** the idempotent skip is core to the usecase (partial fill, resume after failure).

### examined: the promptHiddenInput call

```ts
const secret = await promptHiddenInput({
  prompt: `      enter value for ${keyName}:`,
});
```

can this be simplified?

**question:** do we need custom prompt format? could we use a simpler prompt?

**verdict: holds.** the prompt needs to show which key we're requesting. the indentation aligns with tree output.

### examined: empty value check

```ts
if (!secret) {
  throw new BadRequestError('value cannot be empty');
}
```

can this be deleted? what if user wants to set an empty value?

**verdict: holds.** empty credentials are never valid. fail-fast prevents silent misconfiguration.

---

## changes from this review

1. ✅ (r1) renamed fixture: genMockKeyrackKeySpec → genMockKeyrackRepoManifest
2. ✅ (r1) removed summary.total
3. ✅ (r1) simplified output format
4. 🆕 simplify progress line: remove index/total counter

---

## apply the new fix

update blueprint progress line from:
```ts
console.log(`\n🔑 key ${idx + 1}/${slugs.length}, ${keyName}`);
```
to:
```ts
console.log(`\n🔑 ${keyName}`);
```

---

## conclusion

deeper review found 1 additional simplification:
- progress line didn't need index/total counter

all other components hold:
- FillKeyResult type: needed for test assertions
- return type: needed for partial success verification
- --env all: low cost, in criteria
- inner loop structure: explicitly required by wish
- vault inference warn: mitigation for identified risk
- already set check: core to idempotent fill
- empty value check: fail-fast on invalid input

the blueprint is now minimal for the requirements.

