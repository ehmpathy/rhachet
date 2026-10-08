# F7 — what a manifest's globs are relative to

**rework: clean · status: ANSWERED · confidence: 91%**

---

## .the fork, stated fairly

a role boot globs relative to the **role dir** — `computeBootPlan` is passed `cwd: roleDir`
(`bootRoleResources.ts:99`). a custom manifest has no role dir, so the base must be chosen.

| option | a route's say entry reads | consequence |
|---|---|---|
| **the manifest's own directory** | `'0.wish.md'` | portable — move or rename the dir, the manifest still works |
| the repo root | `'.behavior/v2026_09_17.feat-boot-manifest-and-budget/0.wish.md'` | every path repeats the dir name; a dir rename breaks every entry |
| the process cwd | `'0.wish.md'`, but only from the right cwd | 🔴 the same manifest renders differently per caller |

---

## .the guess taken, and why

**the manifest's own directory.**

| the argument | |
|---|---|
| it mirrors the extant behavior exactly | a role spec globs its own neighbors; a manifest globs its own neighbors. **one rule, both sources** |
| it is the only portable option | a route dir is named by date-and-slug and does get renamed. repo-root paths would all break |
| it makes the manifest self-contained | which is the whole point of `--manifest` — one file that declares its own payload |
| cwd-relative is a correctness defect | the same file, two callers, two payloads. refuse it outright |

⇒ and it keeps requirement 1's **schema parity** honest: the say/ref globs mean the same in both
sources, so there is one dialect rather than two.

---

## .the confidence — 91%

| confident | not confident |
|---|---|
| manifest-dir is right, cwd is wrong | whether a manifest should be able to reach **outside** its own dir |
| it mirrors the role-dir rule | whether `'../shared/x.md'` should be permitted or refused |

🟡 the 9% is that escape question, and it couples to the **outside-repo rejection invariant**
(axis D). a manifest at `.behavior/v.../boot.yml` that says `'../../src/index.ts'` is inside the
repo but outside its own dir.

⇒ **best-guess: permit within the repo, refuse outside it.** the repo boundary is the invariant
that already governs every file-touch skill here (`cpsafe`, `rmsafe`, `teesafe`); the manifest-dir
is a *default base*, not a jail.

---

## .the rework cost — why clean

one argument to `computeBootPlan` (`cwd:`), which already takes it. no contract, no persisted
value — until a consumer writes a manifest, at which point the base becomes the contract those
manifests are authored against.

🟡 so, like F3, this is clean **now** and dirties when
`rhachet-roles-bhrain#510` / `rhachet-roles-bhuild#392` land.

---

## .where

- `src/domain.operations/invoke/bootRoleResources.ts:99` — `cwd: roleDir`
- `src/domain.operations/boot/filterBootResourcesByGlob.ts:9-33` — the glob call
- `1.vision.experience.case=3.manifest-boot-within-budget.md` — the demo that raises it

## .the verdict

_(open — for the fulcrum council)_
