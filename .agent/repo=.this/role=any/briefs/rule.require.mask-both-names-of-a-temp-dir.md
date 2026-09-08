# rule.require.mask-both-names-of-a-temp-dir

## .what

when a test masks a `genTempDir` path out of a snapshot by **exact string swap**, it must swap
**both names the directory answers to** — the path `genTempDir` returned, *and* its `realpath`.

they are different strings for the same directory, and a spawned child reports the second one.

## .why

`genTempDir` (test-fns) keeps its scratch dir **inside the repo**, reached through a symlink:

```
returned  : <repo>/.temp/genTempDir.symlink/2026-09-05T14-07-29.542Z._.my-slug.9f16ddf0
realpath  : /tmp/test-fns/<repo>/.temp/2026-09-05T14-07-29.542Z._.my-slug.9f16ddf0
```

a child process handed the **returned** path as its `cwd` reports `process.cwd()` **resolved** —
node resolves symlinks — so every absolute path the child prints carries the `/tmp/...` form. a
mask that swaps only the returned form matches **not one occurrence**.

⚠️ **it fails silently and in the worst direction.** the swap does not throw; it simply does no
work. the raw per-run path — a timestamp **and** a random hash — lands in a committed snapshot,
which is then green **exactly once**, on the run that wrote it
(`rule.require.snapshot-verified-on-independent-run`).

## .how

```ts
const asTempDirMasked = (input: { output: string; testDir: string }): string =>
  [input.testDir, realpathSync(input.testDir)].reduce(
    (masked, dir) => masked.split(dir).join('/TMP_REPO'),
    input.output,
  );
```

- swap the **exact** strings, never a `/tmp/...` regex — a regex cannot tell a volatile temp path
  from a real absolute path the render should have kept
- use `/TMP_REPO`, the placeholder `asSnapshotSafe` already uses — one vocabulary per concept
- run the temp swap **before** `asSnapshotSafe`: the dir name carries a uuid, and
  `asSnapshotSafe` rewrites uuids to `__SERIAL__`, so the reverse order mangles the path first

## .the test

resnap, then read the diff. if any absolute path survives with a timestamp or a hash in it, the
mask did not bite — regardless of whether the suite passed.

then run **again without `--resnap`**. a mask that only half-works still passes the run that
wrote it.

## .the trap this replaces

a catch-all regex like `.replace(/"\/[^"]*"/g, '"<PATH>"')` masks the symptom and hides the
cause. it also **eats the filename**, so `"/tmp/…/.agent/does-not-exist/keyrack.yml"` collapses
to `"<PATH>"` — and the path that names the failure is the fact a reviewer needs. the exact swap
keeps `/TMP_REPO/.agent/does-not-exist/keyrack.yml`.

## .note

this is why `genTempDir` is still the right tool — it keeps scratch inside the repo rather than
loose in `/tmp` (`rule.forbid.adhoc-gentempdir-reimpl`). the symlink is the feature; the two
names are its cost, and this rule is how you pay it.

## .enforcement

- an exact-path temp mask that swaps only the returned path, never its realpath = **blocker**
- a committed snapshot that carries a per-run timestamp or hash = **blocker**
- a catch-all absolute-path regex used where an exact swap would serve = **nitpick**

## .see also

- `rule.require.snapshot-verified-on-independent-run` — the rule this defect defeats
- `rule.forbid.adhoc-gentempdir-reimpl` — why `genTempDir` is mandatory in the first place
- `blackbox/.test/infra/invokeRhachetCliBinary.ts` — `asSnapshotSafe`, the shared masker and the
  source of the `/TMP_REPO` placeholder
