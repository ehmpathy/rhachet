# define.statsync-and-lstatsync-suppress-different-errnos

> **`throwIfNoEntry: false` has no single meaning. `statSync` and `lstatSync` honor it
> differently, and on two of four errnos their answers are exact opposites.**

node's own docs say the option governs *"whether an exception will be thrown if no file system
entry exists"*, which reads as `ENOENT` and only `ENOENT`. neither syscall holds to that, and
neither departs from it the same way.

**`statSync` is wider than the docs**: a path whose **parent component is a regular file**
(`ENOTDIR`) is also reported as an absence.

## 🔴 .and `lstatSync` suppresses a DIFFERENT set — the two are not interchangeable

> **`statSync` and `lstatSync` take the same option and honor it differently on two of four
> errnos.** a fixture picked from the wrong column is green with the defect present.

`npx tsx`, node 22, linux. every cell measured, both syscalls, `{ throwIfNoEntry: false }`:

| the path | errno | `statSync` | `lstatSync` |
|---|---|---|---|
| `dir/nope/boot.yml` | `ENOENT` | ✅ `undefined` | ✅ `undefined` |
| `dir/plain.txt/boot.yml` | `ENOTDIR` | 🔴 **`undefined`** | 🔴 **THROWS** |
| a two-link symlink cycle | `ELOOP` | **THROWS** | 🔴 **returns a stat** |
| a 400-char basename | `ENAMETOOLONG` | **THROWS** | **THROWS** |

the two disagreements each have a plain cause, and neither is guessable from the option's name:

- **`ENOTDIR`** — `statSync` folds it into its absence bucket; `lstatSync` does not
- **`ELOOP`** — `lstatSync` stats the LINK rather than its target, so it never walks the cycle
  at all. there is no hop limit to hit, and it returns a stat whose `isSymbolicLink()` is `true`

🔴 **⇒ so the fixture is chosen by SYSCALL, never by errno.** a symlink cycle drives `statSync`
and is inert against `lstatSync`; a file-as-parent-component drives `lstatSync` and is inert
against `statSync`. **they are exact opposites**, which is the worst possible shape for an
author who reaches for "the" fixture.

⚠️ a clamp built from the `statSync` row against an `lstatSync` call site passes with the defect
injected — a green clamp over a live defect, which is the one outcome
`rule.require.clamp-edge-cases` exists to prevent. **a measurement is evidence only for the
operation it measured.**

## .why it matters — it decides both halves of an errno narrow

a caller who wraps `statSync` to classify its faults gets the set wrong in **both** directions
if they reason from the docs rather than measure:

- **a dead branch.** `code === 'ENOTDIR'` can never be taken, and a dead branch reads to the
  next author as a case that IS handled
- **a dead fixture.** a test that provokes `ENOTDIR` to exercise the throw path never reaches
  it, so the clamp is green with the defect present (`rule.require.clamp-edge-cases`)

⇒ a probe per syscall is what exposes both; the docs expose neither.

## 🔴 .the fixture to reach for — look up the SYSCALL first

> **`statSync` → a two-link symlink cycle. `lstatSync` → a file as a parent component.**
> they do not swap.

```ts
// for a `statSync` call site — `ELOOP`
symlinkSync(pathB, pathA);
symlinkSync(pathA, pathB);
statSync(pathA, { throwIfNoEntry: false }); // throws, code 'ELOOP'
                                            // 🔴 lstatSync here returns a stat — inert
```

```ts
// for an `lstatSync` call site — `ENOTDIR`
writeFileSync(pathParent, 'a file where a dir would sit');
lstatSync(resolve(pathParent, 'child.yml'), { throwIfNoEntry: false }); // throws, 'ENOTDIR'
                                            // 🔴 statSync here returns undefined — inert
```

`ENAMETOOLONG` (a 400-char basename) throws on **both**, so it is the one portable fixture —
at the cost of a path no real caller would produce, which makes the clamp read as contrived.

🔴 **and NOT `EACCES` via `chmod 000`** — root ignores the mode bits, so such a clamp is green
with the defect present on any container that runs tests as root, which is the exact host CI
uses (`rule.require.hermetic-tests`).

## .see also

- `src/domain.operations/boot/getOneBootSourceFromManifest.ts` — the `statSync` narrow this shaped
- `src/domain.operations/boot/getOneBootBudgetRung.integration.test.ts` `[case1]` — the
  `lstatSync` clamp, built from the `ENOTDIR` row
- `src/infra/filesystem/getAllFilesFromDir.ts` — the peer walk, which narrows by hand at four
  sites across `realpathSync`, `readdirSync`, `statSync`, and `lstatSync`
