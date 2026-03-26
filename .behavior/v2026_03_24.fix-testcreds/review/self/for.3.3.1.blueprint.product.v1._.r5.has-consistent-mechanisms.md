# self-review: has-consistent-mechanisms

## mechanism.1 = getAllAvailableIdentities with owner param

| question | answer |
|----------|--------|
| does codebase have this already? | yes — getAllAvailableIdentities exists in daoKeyrackHostManifest |
| are we duplicate? | no — extend extant function with owner param |
| can we reuse extant? | yes — we add to it, not duplicate it |

**holds**: this extends the extant getAllAvailableIdentities function via an optional owner parameter. no duplication.

---

## mechanism.2 = jest.integration.env.ts keyrack pattern

| question | answer |
|----------|--------|
| does codebase have this already? | no — this is the component we modify |
| are we duplicate? | no — replace extant pattern |
| can we reuse extant? | n/a — this is the target of modification |

**holds**: we modify the extant jest.integration.env.ts, not create a new file.

---

## mechanism.3 = CI passthrough check

| question | answer |
|----------|--------|
| does codebase have this already? | partially — extant code checks process.env for keys |
| are we duplicate? | no — refine extant pattern |
| can we reuse extant? | yes — we reuse the process.env check concept |

**holds**: the extant code already checks `process.env[key]`. we refine this to check all keys upfront before keyrack spawn.

---

## mechanism.4 = ConstraintError for failfast

| question | answer |
|----------|--------|
| does codebase have this already? | yes — helpful-errors package (v1.7.2) |
| are we duplicate? | no — reuse extant package |
| can we reuse extant? | yes — import and use |

**holds**: ConstraintError is provided by helpful-errors, which is already a dependency. no new error types needed.

---

## mechanism.5 = execSync for CLI spawn

| question | answer |
|----------|--------|
| does codebase have this already? | yes — node:child_process standard library |
| are we duplicate? | no — use standard library |
| can we reuse extant? | yes — import from node:child_process |

**holds**: execSync is a standard node API. no wrapper or abstraction needed.

---

## mechanism.6 = sshPrikeyToAgeIdentity

| question | answer |
|----------|--------|
| does codebase have this already? | yes — extant function in keyrack codebase |
| are we duplicate? | no — reuse extant function |
| can we reuse extant? | yes — already imported in getAllAvailableIdentities |

**holds**: sshPrikeyToAgeIdentity already exists and is used in getAllAvailableIdentities. we reuse it for the owner path check.

---

## summary

| mechanism | verdict |
|-----------|---------|
| getAllAvailableIdentities extension | holds — extend extant function |
| jest.integration.env.ts pattern | holds — modify extant component |
| CI passthrough | holds — refine extant process.env check |
| ConstraintError | holds — reuse extant package |
| execSync | holds — use standard library |
| sshPrikeyToAgeIdentity | holds — reuse extant function |

**no duplication identified**. all mechanisms in the blueprint either:
- extend extant functionality (getAllAvailableIdentities)
- modify extant components (jest.integration.env.ts)
- reuse extant utilities (ConstraintError, sshPrikeyToAgeIdentity, execSync)

no new utilities, operations, or patterns introduced that duplicate extant code.
