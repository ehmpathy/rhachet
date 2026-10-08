# F8 — the `path=` prefix for a manifest-sourced resource

**rework: clean · status: ANSWERED · confidence: 85%**

---

## .the fork, stated fairly

a role boot labels every rendered resource with a synthetic, coordinate-shaped path
(`bootRoleResources.ts:192-193`):

```ts
const getRelativePath = (filepath: string): string =>
  `.agent/repo=${slugRepo}/role=${slugRole}/${relative(roleDir, filepath)}`;
```

```
<brief.say path=".agent/repo=ehmpathy/role=mechanic/briefs/core.md">
```

a manifest has **no repo/role coordinates**, so the prefix must be chosen.

| option | renders as | consequence |
|---|---|---|
| **repo-root-relative** | `path=".behavior/v2026_09_17.../0.wish.md"` | a real path. a brain can open it; a human can grep it |
| a synthetic coordinate | `path="manifest=v2026_09_17.../0.wish.md"` | matches the role shape, names no openable file |
| manifest-dir-relative | `path="0.wish.md"` | ambiguous — two manifests both claim `0.wish.md` |

---

## .the guess taken, and why

**repo-root-relative.**

| the argument | |
|---|---|
| it is **openable** | the path a brain reads is the path a brain can `Read`. the role form is synthetic only because `.agent/` symlinks make the real path unstable |
| it is greppable | `rule.forbid.grepsafe-path-globs` exists because paths in this repo get grepped. a synthetic prefix breaks that |
| it is unambiguous | two route manifests can each hold a `0.wish.md`; only the rooted path parts them |

🟡 **note the asymmetry this creates, deliberately.** a role-sourced resource keeps its synthetic
`repo=/role=` prefix; a manifest-sourced one gets a real path. that reads as a parity violation
against requirement 1 — and it is not: requirement 1 asks for **schema** parity (the say/ref/budget
keys), never for an identical label shape. the role form is synthetic *because* it has coordinates
worth a name; a manifest has none.

---

## .the confidence — 85%

| confident | not confident |
|---|---|
| a real, openable path beats a synthetic one | whether the asymmetry with role boots will read as a defect to a reviewer |
| root-relative beats manifest-relative | whether a consumer parses these labels today |

🔴 the 15% is that last item, and it is the one I could not verify: **if any consumer parses
`path=` to recover `repo=`/`role=`**, a second label shape would break it. i found no such parser
in this repo, but the two dispatched consumer tasks have not been written yet — so the risk is
forward, not backward.

⇒ mitigation, if the council wants belt-and-braces: emit **both** — a real `path=` plus an
optional `source="manifest:<rel-path>"` attribute. it costs one attribute and removes the guess.

---

## .the rework cost — why clean

one template string in one operation, plus a resnap. no persisted value.

🟡 dirties when a consumer parses the label — the same forward coupler as F3 and F7.

---

## .where

- `src/domain.operations/invoke/bootRoleResources.ts:192-193` — `getRelativePath`
- `src/domain.operations/invoke/bootRoleResources.ts:196-252` — every emit site that uses it
- `rule.forbid.grepsafe-path-globs` — why greppability matters here

## .the verdict

_(open — for the fulcrum council)_
