# self-review r1: has-questioned-assumptions

## surface hidden technical assumptions

### assumption 1: getAllKeyrackSlugsForEnv returns the correct slugs

**assumed:** getAllKeyrackSlugsForEnv will return all key slugs declared for the env, which includes those from extends.

**evidence:** checked the function exists and is used elsewhere in keyrack code. the manifest expansion handles extends.

**what if wrong:** if it doesn't handle extends, fill would miss keys from extended manifests.

**verdict: verify at implementation time.** assumption is likely correct but needs test coverage for extends scenario.

### assumption 2: genKeyrackHostContext handles prikey pool correctly

**assumed:** genKeyrackHostContext accepts prikeys array and tries each against the owner's host manifest.

**evidence:** other keyrack commands use similar patterns. the context generators are reused.

**what if wrong:** if genKeyrackHostContext doesn't accept prikeys, we'd need to modify it or create a new context generator.

**verdict: verify at implementation time.** may need to check genKeyrackHostContext signature.

### assumption 3: setKeyrackKey can be called without interactive prompt

**assumed:** setKeyrackKey accepts a secret value directly.

**evidence:** checked setKeyrackKey in prior read. it takes secret as input, so yes.

**verdict: holds.** evidence confirms the API accepts secret directly.

### assumption 4: unlock immediately after set will work

**assumed:** after setKeyrackKey, unlockKeyrackKeys can immediately decrypt the key.

**what if wrong:** if there's a time delay issue or the set doesn't persist synchronously, unlock could fail.

**evidence:** keyrack operations are synchronous file operations. no async persistence delay.

**verdict: holds.** filesystem operations are synchronous.

### assumption 5: hostManifest.hosts[slug] indicates key is set

**assumed:** we can check if a key is configured via hostManifest.hosts[slug].

**evidence:** this is how other keyrack operations check for key presence.

**what if wrong:** if the structure is different, our skip logic would break.

**verdict: holds.** consistent with extant keyrack patterns.

### assumption 6: inferKeyrackVaultFromKey exists and works

**assumed:** there's a function to infer vault from key name characteristics.

**evidence:** the codepath tree marks it as REUSE, which implies it exists.

**what if wrong:** if it doesn't exist, we'd need to implement vault inference or make vault required.

**verdict: verify at implementation time.** may need to check if function exists.

### assumption 7: console.log is acceptable for output

**assumed:** fillKeyrackKeys can use console.log for output.

**evidence:** other domain operations use context.log for observability. console.log is used in CLI-level code.

**what if wrong:** if we need structured logs, console.log won't work.

**alternative:** use context.log.info() for consistency with other operations.

**verdict: reconsider.** should use context.log for consistency. but for CLI output, console.log is acceptable since this is user-faced terminal output, not observability logs.

### assumption 8: BadRequestError is the right error type for empty value

**assumed:** empty secret input is a "bad request" scenario.

**evidence:** BadRequestError is used for user input validation errors throughout.

**verdict: holds.** consistent with error patterns.

### assumption 9: one prompt per key × owner is the right interaction model

**assumed:** user should enter the value separately for each key × owner combination.

**what if opposite:** user enters value once, we copy to all owners.

**evidence:** the vision explicitly says values may differ per owner. separate prompts are correct.

**verdict: holds.** vision explicitly addresses this.

### assumption 10: the test file should be .play.integration.test.ts

**assumed:** journey tests use .play.integration.test.ts suffix.

**evidence:** the experience reproduction document and self-reviews confirmed this convention.

**verdict: holds.** confirmed in prior self-review.

---

## assumptions verified vs needs verification

**verified (8):**
- setKeyrackKey accepts secret directly
- unlock works immediately after set
- hostManifest.hosts[slug] indicates key presence
- console.log is acceptable for CLI output
- BadRequestError for empty value
- one prompt per key × owner is correct
- .play.integration.test.ts convention

**needs verification at implementation time (3):**
- getAllKeyrackSlugsForEnv handles extends
- genKeyrackHostContext accepts prikeys array
- inferKeyrackVaultFromKey exists

---

## conclusion

no blocker assumptions found. 3 assumptions need verification at implementation time, which is expected for a blueprint. the blueprint is based on reasonable assumptions about extant primitives.

