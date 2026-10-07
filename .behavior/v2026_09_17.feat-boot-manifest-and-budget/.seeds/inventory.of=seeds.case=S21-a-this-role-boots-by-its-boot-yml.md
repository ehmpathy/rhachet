# S21 — a `.this` role boots by its boot.yml

- **raised** = 2026-10-06, beside `S20`
- **kind** = contract — it narrows which native roles reach a brain dir's boot

---

## .said

> and we should ensure to automatically boot any repo=.this/role=* roles that have a boot.yml btw

asked whether a `.this` role with no `boot.yml` should still boot, the wisher chose the option
labelled *"boot.yml is the opt-in"*.

---

## .settled

**a `.agent/repo=.this/role=$slug` dir boots into the brain dirs if and only if it holds a
`boot.yml`.** the spec is the opt-in, as the budget in it is the opt-in to the gate (`S20`).

| a `.this` role dir | boots by default? |
|---|---|
| with a `boot.yml` that has a payload | ✅ per its spec |
| with a `boot.yml` that has no payload key | ✅ every brief says (the default render) |
| with no `boot.yml` | 🔴 no. still reachable by an explicit `roles boot --repo .this --role $slug` |

🟡 the removal guard is unchanged: every native dir is still refused by `roles unlink`, spec or no.

---

## .landed

- `src/domain.operations/init/roles/link/getAllLinkedRoleRefs.ts` — the filter on native slugs
- `getAllLinkedRoleRefs.integration.test.ts` — case5, case6
- `syncBootsForBrainDirs.integration.test.ts` · `brainDirBootJourney.ts` — fixtures given a `boot.yml`
