# F8 — an extant convention holds over a one-off divergence in this diff

## .the fork

peer review i001 asked for five local divergences from conventions the keyrack tree already holds:

- `expires in: Nm` → `=` form, one leaf apart from its `env:` / `org:` peers (r001 nitpick.1)
- `reach?` → `reach | null` on the renew record alone, while the grant, the store, and the wire keep `reach?` (r006 nitpick.1)
- `daemonRenewRecord` to stop its import of `asKeyrackKeySlugAtReach`, which `daemonKeyStore` beside it imports the same way (r005 nitpick.2)
- `renew*` / `schedule*` / `emit*` → a get/set/gen/del prefix, beside extant `scheduleAutoTermination` and `emit*` twins (r005 nitpick.3)
- the moved session-ended predicates → renamed transformers in the same diff that moves them (r003 nitpick.1)

the review at hash `d8bd8509` raised the same shape again:

- `scheduleDaemonRenewTick` deps → `context`, beside `scheduleAutoTermination`'s deps-in-input (r004 nitpick.2)
- the renew's `console.log` → an injected logger, while the rest of the daemon logs via `console.log` (r004 nitpick.3)
- `daemonRenewRecord` off the shared address cast its peer `daemonKeyStore` uses (r005 blocker.1, with F13)
- the extant `env:` / `org:` / `expires in:` leaves → `=` form beside the new renew leaf (r009 nitpick.1)

- **a** — diverge here, for the files this diff touches
- **b** — hold the extant convention; repair it for the whole family in a change of its own

## .taken

b. each divergence would leave two conventions side by side for one concept (a mixed tree, two reach shapes, two address paths), which costs every later reader more than the one-off gain. the colon form carries a note beside `leafExpiry` so its hold reads as declared.

## .rework

clean: each is a local edit plus, for the colon form, one snapshot family.

## .confidence — 80%, why not higher

the rules cited are real, and a reviewer may rule that a touched line owes its repair now (scouts-honor) even at the cost of a mixed family.

## .where

- `src/domain.operations/keyrack/cli/asKeyrackStatusKeyBranch.ts`
- `src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonRenewRecord.ts`
- `src/domain.operations/keyrack/adapters/vaults/aws.config/getOneAwsSsoSessionProof.ts`

## .verdict

open — to the commander at the pr.
