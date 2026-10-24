# domain.term.choice.reason: role.focus

## .etymology

**focus** says what the operation does to a role: the whole role stays enrolled — its hooks, its
identity, its link — and attention narrows to a part of what it knows. a lens that focuses does
not remove the scene; it chooses what is sharp. that is the exact contract: hooks whole, briefs
narrowed.

the token form, `role::subject`, puts the role first and the subject after, so the role is the
subject of the sentence and the focus is where it looks — `mechanic::101` reads "mechanic, at 101".

## .the rejected peers

| candidate | why it was refused |
|---|---|
| `scope` | already the test runner's word (`--scope path://…`) and the review bind's. one word, many concepts — `rule.forbid.domain-term-ambiguity` |
| `slice` | implies the role is cut, and a cut role would lose its hooks too. the contract is the opposite |
| `subset` | names the set operation, not the domain act; it says naught of what stays whole |
| `narrow` | a verb, and the receipt's word for one KIND of focus change (narrow · move · widen). a noun of the same form would overload it |
| `filter` | already a glossary term (`term=filter`), and implies a predicate applied per item, where a focus is a declared set |

## .the boundary — two senses of one word, qualified

`focus` was already a term here before this behavior: `BrainFocus`, what a brain attends to. the
question *"focus, of what?"* has two one-word answers — **brain**, **role** — so the repair is a
qualifier, never a second word (`rule.require.boundary-qualified-terms`). the two do not collide in
code: one is a type (`BrainFocus`), the other a field (`subjects` on `RoleLinkRefAtFocus`) and a
token (`::`).

## .the plural

`foci`, the latin plural, as the ambient record is named (`roles.foci.json`) and its operations
(`getRepoAmbientRoleFoci`). one plural, used everywhere; `focuses` is not used in any contract.

## .evidence

- **the behavior that coined it**: `.behavior/v2026_10_21.feat-enroll-role-subject-focus/`,
  whose wish names the act "enroll a role at a subject focus"
- **dimensional walk**: the receipt names every move between foci — a whole role to a focus
  (narrow), one focus to another (move), a focus to the whole role (widen) — in
  `asRoleFocusChanges.test.ts`
- **refusals that bound the term**: `-role::subject` (F1), a role whole and focused in one exact
  set, a focus on `upgrade --roles` (F7), an undeclared subject (U1) — each a `ConstraintError`
  that names the fix
