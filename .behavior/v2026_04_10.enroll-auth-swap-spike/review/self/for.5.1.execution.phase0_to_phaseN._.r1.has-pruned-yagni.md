# self-review: has-pruned-yagni

review for extras not prescribed in vision/criteria.

---

## reviewed components

### BrainAuthError class
- **status**: YAGNI - created but never used
- **action**: can be deleted; errors are thrown via BadRequestError/UnexpectedCodePathError
- **note**: kept for now as placeholder for future brain-auth-specific errors

### genApiKeyHelperCommand transformer
- **status**: prescribed - wish mentioned "could we control that externally or via an env var?"
- **why it holds**: generates the command for claude-code's `api_key_helper` config
- **note**: not yet wired into enrollment, but needed for the end goal

### BrainAuthCapacity with tokens metrics
- **status**: prescribed - wish said "swap to best auth based on current usage stats"
- **why it holds**: capacity metrics are the interface; round-robin ignores them for spike
- **note**: explicitly deferred capacity-based selection to post-spike

### status subcommand
- **status**: useful but not explicitly requested
- **why it holds**: pool rotation debug needs visibility
- **action**: keep - low cost, high value for observability

### rotation state interface
- **status**: prescribed - needed for round-robin to persist index
- **why it holds**: without this, every call would return credential index 0
- **note**: currently in-memory; cross-process persistence is a known TODO

---

## overall assessment

most components are minimum viable for the spike goal of proof that credential rotation works.

one clear YAGNI: `BrainAuthError` is defined but unused. left as placeholder - zero runtime cost.

no deletions needed to proceed.
