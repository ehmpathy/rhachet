# domain.term.choice.reason: reference

## .etymology

a reference is a pointer to a value that lives elsewhere. in keyrack the REFERENCE mechanism is the
one where keyrack writes no value — it stores only the exid (the external address) and reads the
value live on unlock. 1password (`op://vault/item/field`) is the archetype; the aws.params
point-at-an-out-of-band-SSM-param mode is the same shape. the axis that separates the two static
mechs is WHO WRITES THE VALUE: for reference, keyrack does not — a human or some other process
placed it.

chosen over `pointer` / `link` / `alias` — all generic address words that miss the
keyrack-does-not-own-the-write intent that is the whole point of the term.

## .the paired contrast — reference vs replica

see `term=replica._.choice.reason.md` for the symmetric pair (split on who-writes-the-value). both
deliver via the `mechAdapterReplica` passthrough; they differ only at SET.

## .the re-set / re-point model (settled 2026-08-02, aws.params #59)

a **re-set** = a second `keyrack set` on an already-registered key. keyrack's `set` verb is an
idempotent upsert, so a re-set is NOT an error and is NOT flag-gated — config is declarative: you
re-declare the key's storage and keyrack converges to it. what a re-set DOES depends on who owns the
value:

- **reference re-set at a new `--exid` = a re-point.** the reference's target moves to a different
  external param. reference writes no value, so NO secret is orphaned — only the manifest pointer
  moves. post-#57 the new target is VERIFIED at set (fail-loud if absent), so there is NO "existence
  not verified" note anymore — the note the earlier build emitted is gone (a re-point is a verified
  pointer edit, not an unverified register). the CLI echoes `re-pointed: was <old> → now <new>` so a
  typo'd `--exid` that silently swaps which secret a widely-shared key resolves to is visible, never
  archaeology.
- **owned (replica / github-app) re-set at the SAME path = a rotation.** keyrack overwrites the value
  it owns in SSM — a deliberate re-persist, confirmed loud.
- **owned re-set at a DIFFERENT path = a re-point that orphans.** the old keyrack-written value is
  stranded at the old path (v1 defers destructive cleanup), so the set surfaces a residual-secret
  note — never a silent orphan.

### terminology decision

- the mech NOUN stays `reference` (`pointer` / `link` / `alias` forbidden as its name).
- the config VERB stays `set` (keyrack taxonomy); a second `set` is a **re-set**.
- **re-point** is the accepted human-perspective description of what a re-set does to a reference's
  TARGET (the exid moves). it names an ACTION, not the reference CONCEPT, so it does not violate
  `rule.forbid.domain-term-synonyms` — the forbid bars `pointer` as the NAME of the reference mech,
  not the verb that describes how a reference's target moves. the reference `.what` already uses
  "pointer" descriptively for the same reason.
- **rotation** is the canonical word for an owned-key re-set at the same path (overwrite in place).

## .evidence

- `getOneKeyrackMechAdapter.ts:36` — `PERMANENT_VIA_REFERENCE` maps to `mechAdapterReplica`,
  commented "passthrough, exid fetched on unlock".
- settled 2026-08-02 (aws.params #57): because keyrack holds only an unverified, human-typed pointer
  for a reference, a set-time read-roundtrip matters MORE than for a written value. this decision is
  now SETTLED and BUILT: a `PERMANENT_VIA_REFERENCE` set reads the referenced SecureString back
  through the SAME org-scope identity + value gates unlock walks (the shared
  `getOneKeyrackAwsParamSecureValue` seam), so a typo'd exid/org/env/region fails loud at set, not at
  a later unattended unlock. a consequence of the identity hardcut: a specific-org reference set now
  requires the org's declared `AWS_PROFILE` at set time (fail-loud if absent) — the identity axis
  surfaces at config time, not only at unlock.
- corollary surfaced the same round, now BUILT (aws.params #69): an aws.params key whose secret
  keyrack stores IN SSM is a `replica`, not a `reference`. aws.params supports BOTH — the mech is
  orthogonal to the vault — via `setKeyrackAwsParamReplica` (the write+roundtrip-verify twin of the
  github-app persist). both mechs share the get path (`mechAdapterReplica` passthrough); they split
  only at set (write vs point).
