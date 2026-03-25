# self-review: has-questioned-requirements

## requirement 1: os.daemon vault for ephemeral keys

### who said this was needed?
the wisher, in `0.wish.md`:
> "keyrack set --key EXAMPLE_KEY --vault os.daemon so that we can set keys adhoc temporarily into daemon without persistent storage"

### what evidence supports this?
1. bash history pollution is a real security concern
2. extant vaults (os.secure, os.direct) both persist to disk
3. developers need quick adhoc keys for debugging

### what if we didn't do this?
users continue with `export KEY=...` in terminal — keys in bash history, security risk.

### is the scope right-sized?

**discovery: os.daemon adapter already implements set()**

from `vaultAdapterOsDaemon.ts:63-92`:
```ts
set: async (input) => {
  const secret = await promptHiddenInput({ prompt: ... });
  await daemonAccessUnlock({ keys: [...] });
}
```

**the adapter already works.** the question is whether the CLI allows `--vault os.daemon` in set command, or if something else blocks it.

### could we achieve the goal simpler?
possibly — if the CLI just needs to allow `--vault os.daemon`, this might be a small change rather than new functionality.

### verdict: requirement holds, but scope may be smaller than vision implies

**action:** need to verify what actually blocks `keyrack set --vault os.daemon` today.

---

## requirement 2: 1password vault integration

### who said this was needed?
the wisher, in `0.wish.md`:
> "keyrack set --key EXAMPLE_KEY --vault 1password so that we can leverage the 1password cli to grant keys"

and specifically:
> "set should verify that 1password cli (or sdk?) is setup on this machine and then should simply set into the host manifest the exid of where to find the key within 1password"

### what evidence supports this?
1. 1password is widely used for credential management
2. manual copy-paste workflow is tedious and insecure
3. 1password cli (`op`) supports biometric + service accounts

### what if we didn't do this?
users continue with manual 1password → export workflow. or they store secrets in os.secure/os.direct (duplicating secrets across systems).

### is the scope right-sized?
the wish is clear: set stores exid (pointer), unlock fetches from 1password.

**current state from `vaultAdapter1Password.ts:88-92`:**
```ts
set: async (input) => {
  throw new UnexpectedCodePathError(
    '1password vault does not support set via keyrack; use 1password app or cli directly',
    { input },
  );
}
```

the adapter needs modification to:
1. prompt for exid (not secret)
2. validate `op` cli is available
3. optionally validate exid by attempting read
4. return `{ exid }` for manifest storage

### could we achieve the goal simpler?
the wish is already the simplest approach:
- don't try to write to 1password (complex, requires item creation)
- just store a pointer (exid)
- let 1password remain source of truth

### verdict: requirement holds as described

**non-issue:** the vision correctly captures set-as-pointer semantics.

---

## requirement 3: unlock flow for 1password

### who said this was needed?
the wisher, in `0.wish.md`:
> "unlock should then actually pull the key value from 1password, and set to daemon"

### what evidence supports this?
consistent with other vaults — unlock fetches secret, caches in daemon.

### is the scope right-sized?
yes — 1password adapter already implements get() via `op read`. unlock just needs to use it.

### verdict: requirement holds, already partially implemented

---

## questioned assumptions

### assumption: os.daemon needs no manifest entry

**questioning:** should os.daemon keys persist to manifest?

- if no manifest entry: pure ephemeral, but also invisible to `keyrack status`
- if manifest entry: visible, but implies "persistence" that doesn't exist

**verdict:** the wish says "without persistent storage" — no manifest entry is correct. but we should consider how `keyrack status` handles ephemeral keys.

### assumption: op cli is the interface (not connect api)

**questioning:** should we support 1password connect instead?

- op cli: requires local installation, supports biometric
- connect api: no local install, but requires connect server

**verdict:** op cli is simpler for local dev. connect api could be future enhancement.

---

## issues found

### issue 1: vision may overstate os.daemon scope

the vision implies os.daemon set is new functionality. but the adapter already implements it. need to verify what actually needs changing.

**fix:** updated understanding — likely CLI/flow change, not adapter change.

### issue 2: vision doesn't address manifest behavior for os.daemon

if os.daemon keys have no manifest entry, how does `keyrack unlock --env test` know about them? they're already in daemon, so unlock is a no-op.

**fix:** vision mentions this in "what is awkward" section but doesn't settle it. this is an open question for the wisher.

---

## non-issues that hold

1. **1password set prompts for exid, not secret** — correct per wish
2. **1password unlock fetches via op read** — adapter already supports
3. **consistent vault interface** — set/unlock/get/del contract maintained
4. **ci support via OP_SERVICE_ACCOUNT_TOKEN** — op cli supports this

---

## summary

| requirement | verdict | notes |
|-------------|---------|-------|
| os.daemon set | holds (smaller scope) | adapter exists, likely CLI change |
| 1password set | holds | need adapter modification for exid |
| 1password unlock | holds | adapter.get() already works |
| manifest behavior | open question | how to handle ephemeral in status/unlock |
