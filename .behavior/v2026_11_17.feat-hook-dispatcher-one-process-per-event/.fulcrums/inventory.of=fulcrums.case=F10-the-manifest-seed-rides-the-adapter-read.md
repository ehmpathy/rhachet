# F10 — the manifest seed rides the adapter's first read

## .the fork

the manifest adapter seeds an absent manifest from the role hooks the settings hold, inside its rule
read. two reviewers named a read that writes.

- **(a)** keep the seed inside the adapter: every dao verb (get, set, del) meets a seeded manifest,
  and the seed is a findsert of the file itself, so it writes once per brain dir
- **(b)** lift the seed into a `gen*` step each caller runs before the sync

## .taken

(a). the sync and the orphan prune reach the adapter through the extant `BrainHooksAdapter`
contract; three callers (sync, prune, dispatcher swap) would each owe the seed call under (b), and a
caller that forgot it would diff against an empty manifest and report every role hook as new. the
seed is documented on `getRules` as a findsert.

## .rework

clean. a `genHookDispatchManifestSeeded` step, called by the three callers before they diff.

## .confidence

80%. the seed is idempotent and fires once; the cost is a read that may write on first contact.

## .where

`src/domain.operations/brains/dispatch/genBrainHooksAdapterViaDispatchManifest.ts` (`getRules`)

## .verdict

open, for the director at the pr.
