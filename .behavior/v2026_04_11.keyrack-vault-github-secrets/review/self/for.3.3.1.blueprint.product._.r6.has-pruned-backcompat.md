# self-review: has-pruned-backcompat (r6)

## deeper reflection: where could backwards compat hide?

r5 checked the obvious places. let me look deeper for subtle backcompat.

---

### potential concern: `status: locked` semantic reuse

**the question:** is reuse of `locked` for github.secrets a form of backwards compat?

vision line 213-220 discusses this:
> `status: locked` is semantically overloaded
> for os.secure, `locked` means "was set but not unlocked for this session"
> for github.secrets, `locked` means "was set but can never be retrieved"

**why it's NOT backcompat:**

this is semantic extension, not backwards compat. we do not:
- maintain old behavior for old callers
- add shims for old code
- provide migration path

we extend what `locked` means. callers check `fix: null` to distinguish.

---

### potential concern: setKeyrackKeyHost "(unchanged)"

**the question:** the filediff shows `[~]` but comment says "unchanged". is there hidden backcompat?

blueprint line 38:
```
└── [~] setKeyrackKeyHost.ts                             # (unchanged, delegates to adapter)
```

**why it's NOT backcompat:**

the file is marked `[~]` because it's in the change scope, but the orchestrator itself does not change. it delegates to `adapter.set()`. the github.secrets adapter implements `set`, so the orchestrator works unchanged.

this is the adapter pattern. no backcompat shims needed because the abstraction handles dispatch.

---

### potential concern: mech adapter reuse

**the question:** we reuse EPHEMERAL_VIA_GITHUB_APP and PERMANENT_VIA_REPLICA. is this backwards compat?

**why it's NOT backcompat:**

code reuse ≠ backwards compat.

backwards compat would be: "if old vault, use old mech; if new vault, use new mech".

what we have: mech adapters are vault-agnostic. they acquire the secret value. the vault adapter decides where to store it. no conditional logic for old vs new.

---

### potential concern: unlockKeyrackKeys "skip silently"

**the question:** vision says `unlock --for repo` should "skip silently" for github.secrets keys. is this backwards compat for bulk unlock?

vision line 179:
> user runs `unlock --for repo` with github.secrets keys | skip silently (don't break workflow)

**why it's NOT backcompat:**

"don't break workflow" is forward behavior for the new vault, not preservation of old behavior. the change is:

- before: bulk unlock would fail on a key it couldn't retrieve
- after: bulk unlock skips write-only vaults with reason 'remote'

this is new behavior that makes the system more robust, not a shim for old callers.

---

### check against user's zero-backcompat rule

memory says: "never add backwards compat, just delete"

verification against blueprint:
- re-exports of old types? no
- deprecation warnings? no
- feature flags for old/new? no
- migration scripts? no
- "if old, then X" conditionals? no
- unused code kept "just in case"? no

**the blueprint follows the zero-backcompat rule.**

---

## conclusion

no backwards compat found. the blueprint:
- adds new vault type
- extends interface (nullable get)
- adds forward logic for new vault
- reuses code without conditional branches

every change is additive, none is preservative.
