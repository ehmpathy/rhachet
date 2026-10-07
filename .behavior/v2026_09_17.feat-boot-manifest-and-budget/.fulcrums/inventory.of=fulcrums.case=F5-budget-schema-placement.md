# F5 — `budget` schema placement, and the strict-mode fix it forces

**rework: dirty · status: ANSWERED · confidence: 90%**

---

## .the fork, stated fairly

where does `budget` live in the boot.yml schema, and what happens to the key today?

| option | shape |
|---|---|
| **top-level peer** of `briefs`/`skills`/`always` | `budget: { tokens: 5_000 }` at the root |
| a **nested** key inside each section | `always: { budget: {...}, briefs: {...} }` |
| a **separate file** | `boot.budget.yml` beside `boot.yml` |

---

## 🔴 .the discovery that forces the issue — a `budget` key is SWALLOWED today

this is not a preference. **the extant schema accepts and discards the key, twice over**, and
that is precisely the silent pass requirement 2 forbids.

### mechanism 1 — mode detection never sees it

```ts
// computeBootMode.ts:19-24
const hasSimpleKeys  = keys.some((k) => k === 'briefs' || k === 'skills');
const hasSubjectKeys = keys.some((k) => k === 'always' || k.startsWith('subject.'));
```

⇒ a spec with **only** `budget` yields mode `none` → `parseRoleBootYaml` returns `null`
(`parseRoleBootYaml.ts:86`) → **no config at all.** the budget is not merely ignored; the whole
file is.

### mechanism 2 — the `catchall` eats it as a subject

```ts
// RoleBootSpec.ts:39-43
export const schemaRoleBootSpecSubjected = z
  .object({ always: schemaSubjectSection.optional() })
  .catchall(schemaSubjectSection);
```

⇒ `budget: { tokens: 5000 }` parses **as a subject section** (zod objects are non-strict, so
`tokens` is simply dropped), and then the extraction loop keeps only `subject.*` keys
(`parseRoleBootYaml.ts:116-129`). **the budget vanishes with no error.**

### what an author would experience

```yaml
budget:
  tokens: 5_000        # declared in good faith
always:
  briefs:
    say: ['briefs/**/*.md']
```

⇒ boot renders **unbudgeted**, exit 0, and not one line of output says the cap was ignored. the
author believes they are capped. **they are not.**

---

## .the guess taken, and why

**top-level peer, plus a strict-mode guard on the unknown-key case.**

| why top-level | |
|---|---|
| a budget bounds **one render**, and a render is the whole spec's product | a per-section budget is incoherent — the sum of section caps is not the render's cap (`case=6`) |
| it reads as what it is | `budget:` beside `always:` says *"this file has a cap and a payload"* |
| one place to look | an author asks *"what is my cap?"* and greps one key |

| why not the alternatives | |
|---|---|
| **nested per-section** | forbidden — cell **F** in the inventory. incoherent, and it is what the `catchall` accidentally accepts today |
| **a separate file** | two files to keep in step, and a manifest is meant to be *one* self-contained declaration. a `--manifest` pointed at a payload file with its cap elsewhere defeats the point |

### and the strict-mode half

`computeBootMode` must learn `budget` as a **known key that does not decide mode** — a spec of
`budget` alone is still mode `none` for payload purposes, but the budget must survive parse. and
the `catchall` must refuse an unknown key rather than coerce it.

---

## .the confidence — 90%

| confident | not confident |
|---|---|
| the two swallow mechanisms (read the code, quoted above) | **whether strict mode can be turned on without a breakage** |
| top-level is the right position | whether `budget: { tokens }` or a flat `budget.tokens: 5_000` reads better |
| a per-section budget must be refused | whether the refusal is a parse error or a mode error |

🟡 the 10% is the strict-mode risk below.

---

## 🔴 .the rework cost — why dirty

the `catchall` fix touches the parse path **every extant role boot flows through**.

| the hazard | |
|---|---|
| a spec somewhere in the org may carry a stray key that parses today | strict mode would start to **reject** it, and the boot would halt on a file that has worked for months |
| all **15** boot specs are checkable — the published ones too | 🟡 they are symlinked into the tree, so a `Read` reaches them. verified at `review.self r1`: none declares a `budget`, and none carries a stray top-level key |
| ⚠️ but the versions a consumer installs **later** are not | `rhachet-roles-*` ship their own boot.yml files, and a **future** release could add a top-level key a strict parse would then reject |
| `roles.boot.published.acceptance.test.ts` exercises exactly that path | so the test suite would catch it — *if* the fixture covers a stray key, which is unverified |

🔴 **verified at `review.self r1` (issue 5), and it sharpens the grade rather than the reverse.**
`.agent/repo=bhrain/role=driver/boot.yml` is in **subject mode** (`always:` at line 1), so it parses
through `schemaRoleBootSpecSubjected` — **the exact `.catchall` the fix would change.** the blast
radius is confirmed real, not assumed.

🟡 **and it corrected this fulcrum's own stated reason.** an earlier draft said the published specs
*"are not ours to check."* that is **false** — a `Read` follows the symlink. the dirty grade
survives on a narrower and honest basis: **I can check what is installed now; I cannot check what a
consumer installs later.**

⚠️ the read that produced the earlier claim was a `grepsafe` whose silence covered 13 of 15 files,
since both `grepsafe` and `Grep` are symlink-blind. a positive control exposed it.

⇒ **the mitigation is an asymmetric strictness**, and it is worth a note as the likely shape:

- refuse an unknown key **at the top level** (where `budget` lives) — a small, closed set
- keep the `catchall` permissive for `subject.*` sections — where the extant tolerance lives

that narrows the blast radius to the one place the new key sits, and the 15 extant specs all pass
it today. **the forward risk to future published versions remains**, which is why this stays dirty
and open.

---

## .where

- `src/domain.objects/RoleBootSpec.ts:39-43` — the `catchall`
- `src/domain.operations/boot/computeBootMode.ts:19-24` — the mode keys
- `src/domain.operations/boot/parseRoleBootYaml.ts:86, 116-129` — the `none` return, the extraction
- `blackbox/cli/roles.boot.published.acceptance.test.ts` — the published-spec gate

## .the verdict

_(open — for the fulcrum council)_
