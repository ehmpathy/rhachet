# F10 — the os.secure `set` stays one linear flow, not a pipe flow and a guide flow

- **fork** — keep one flow whose steps read the piped source as a nullable value (infer mech · check compat · validate the pipe · refuse a mech mismatch · refuse no recipients · open the tree · take the source · encrypt · verify · write · close the tree) · split into a pipe flow and a guide flow that each return `{ mech, secret, treeHead }`, joined by one fork and a shared tail
- **taken** — one flow. each step already sits in a named operation (`getOneOsSecureMechInferred`, `asOsSecureSourcePipedValid`, `assertOsSecureMechAgreesWithSource`, `asOsSecureSetTreeHead`, `getOneOsSecureSourceForSet`), so the body reads as paragraphs, and the pipe-versus-guide choice lives inside those named operations rather than as `if` branches in the body. a split would duplicate the shared steps (compat, recipients, encrypt, verify, write) or move them into a tail that takes the same nullable inputs back
- **the defect the point found** — a refusal could print under an open tree: the recipients check sat after the tree opened. it now sits before the tree, with the other refusals, so every refusal prints alone. this was fixed whichever way the fork goes
- **rework** — clean. the split is a local refactor of one function in one file; no caller and no output depends on the shape
- **confidence** — 75%. the reviewer's shape may read cleaner to a newcomer; the current one has fewer lines and no duplicate tail
- **where** — peer round i005 on `5.1.execution.from_vision`, r011 nitpick.1; `src/domain.operations/keyrack/adapters/vaults/os.secure/vaultAdapterOsSecure.ts` `set`
- **verdict** — open; to commander at pr
