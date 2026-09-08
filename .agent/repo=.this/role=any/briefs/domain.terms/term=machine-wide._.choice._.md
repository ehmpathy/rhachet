# domain.term: machine-wide

term.chosen   = machine-wide
term.kind     = adj
term.synonyms.forbidden:
- org-agnostic   # RESERVED — it would correctly name a hypothetical `@any`, never `@all`
- manifest-free  # a stated property OF machine-wide, never a second concept
- global
- host-wide
- box-wide
- universal

## .what

of a credential: scoped to **the box itself**, never to any repo. spelled `@all` in the org
segment of a key slug (`@all.$env.$KEY`).

a machine-wide key is declared in the **host** manifest and can be read with **no repo manifest
at all** — from any cwd, even outside a clone, before any repo exists.

## .refs

where the term is declared / used. the footprint spans **~20 sites across every layer** — which
is itself a load-bearing fact: the machine-wide concept is complete downstream, so any verb that
denies an `@all` ask denies it upstream, never for want of logic.

**the expander + the intent**
- src/domain.operations/keyrack/getAllMachineWideSlugsForEnv.ts   # states the design intent
- src/domain.operations/keyrack/getAllSudoSlugsForKeyAsk.ts:28

**the slug / attempt grain**
- src/domain.operations/keyrack/asKeyrackKeySlug.ts:73-85         # `@all` exempt from ORG_MISMATCH
- src/domain.operations/keyrack/asResolvedAttempt.ts:22-25        # `@all` short-circuits the manifest
- src/domain.operations/keyrack/getOneKeyrackGrantByKey.ts:45-53
- src/domain.operations/keyrack/session/unlockKeyrackKeys.ts:257-262
- src/domain.operations/keyrack/setKeyrackKeyHost.ts:239

**the persistence + transport layers**
- src/access/daos/daoKeyrackHostManifest/schema.ts:76             # `@all` a valid org in the host manifest
- src/domain.operations/keyrack/daemon/svc/.../handleGetCommand.ts:36-40   # daemon serves `@all` to any org
- src/domain.operations/keyrack/daemon/sdk/.../daemonAccessGet.ts:56
- src/domain.operations/keyrack/daemon/sdk/.../pruneKeyrackDaemon.ts:17

**the vault adapters**
- .../adapters/vaults/aws.params/asKeyrackAwsParamIdentity.ts:33  # `@all` ⇒ imds identity
- .../adapters/vaults/aws.params/asKeyrackAwsParamName.ts:32      # `@all` ⇒ an `_all_` param segment
- .../adapters/vaults/aws.params/getOneKeyrackAwsParamOrgProfile.ts:25

**the cli surface**
- src/contract/cli/invokeKeyrack.ts:426-430                       # `get --org @all`
- src/contract/cli/invokeKeyrack.ts:1124-1125                     # `set` — the `@all` branch
- src/contract/cli/invokeKeyrack.ts:1322-1323                     # `del` — the `@all` branch
- src/contract/cli/invokeKeyrack.ts:1137, :1409                   # the hints that PROMISE `--org @all` to humans

**the per-verb inventory**
- .agent/repo=.this/role=any/briefs/define.keyrack-verb-machine-wide-support.md
  # which verbs serve a machine-wide ask, which deny it, and by which of the two classes

## .reason

see the ref-level cluster beside this choice:
- `term=machine-wide._.choice.reason.md` — etymology, disputes, evidence
