# requirement: `rhx brains auth use` lands at each scope, proven by a before/after account compare

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

`rhx brains auth use` puts a stored account to use at each of three scopes — a clone, a tree, a grove.
at each scope, proof that it landed is a compare of the account (email, orgId) read from the scope
before and after. the exit code alone never counts as proof: a write that moves naught must not
report success.

## .clamp

grove scope built 2026-11-14, under `.behavior/v2026_11_14.feat-brains-auth-use-get-set/`:

- `src/domain.operations/brain/auth/account/setBrainAuthAccountInUseAtGrove.ts` — `before` read with
  the live token, `after` read back from the grove file; success only when `after` names the
  target's `accountUuid`, `email` and `orgId` alike. a read-back disagreement throws
  `MalfunctionError: use did not land` (exit 1); an env credential that outranks the file throws
  `ConstraintError: use did not land` (exit 2) before any read or write, since the fix is the
  caller's env
- `src/contract/cli/invokeBrainsAuthUse.ts` — no default scope

clone and tree scope: owed, behind fulcrum F1 (the command refuses them, exit 2).

## .proof

owed — a test per scope (clone, tree, grove), against at least two real claude subscriptions, that
asserts `before ≠ after` and `after = target` from a read of the scope, plus a test where the write
lands but the read disagrees and the command fails.

## .source

the wisher, 2026-11-14, wish `.behavior/v2026_11_14.feat-brains-auth-use-get-set/0.wish.md`
(task ehmpathy/rhachet#747), `.what` and `.done when`.
