# domain.term.choice.reason: replica

## .etymology

a replica is a faithful copy. in keyrack the REPLICA mechanism is the one where keyrack acquires
the secret (`acquireForSet` prompts the human) and stores a copy in a vault keyrack owns —
os.secure writes it to the OS keychain; aws.params writes it into SSM (built #69). the
axis that separates the two static mechs is WHO WRITES THE VALUE: for replica, keyrack does.

chosen over `copy` (too generic), `mirror` (implies a continuous sync, which replica does not do),
and `stored-secret` (names the artifact, not the mechanism).

## .the paired contrast — replica vs reference

replica and reference are a symmetric pair, split on one axis: who writes the value.

- **replica** = keyrack WRITES + owns a copy in the vault (os.secure keychain; aws.params SSM write,
  built #69).
- **reference** = keyrack writes no value; it points at a value placed out-of-band and reads it
  live (1password `op://`; aws.params point-at-an-SSM-param).

both DELIVER identically — `mechAdapterReplica.deliverForGet` returns the fetched value as-is
(passthrough) — so both map to `mechAdapterReplica`. the split is at SET (write vs point), never
at get.

## .evidence

- `getOneKeyrackMechAdapter.ts:35-37` — `PERMANENT_VIA_REPLICA` and `PERMANENT_VIA_REFERENCE` both
  map to `mechAdapterReplica`; the comment on REFERENCE reads "passthrough, exid fetched on unlock".
- `mechAdapterReplica.ts:114-116` — `deliverForGet` is identity (passthrough); `validate` firewalls
  long-lived tokens (`ghp_`, `AKIA`, …).
- settled 2026-08-02 (aws.params #57 discussion): the reference-vs-replica axis is who-writes. the
  two consequences it left open are now BOTH settled + built: the reference mech roundtrip-verifies
  at set (#57), and aws.params supports a distinct REPLICA mode (#69) — `setKeyrackAwsParamReplica`
  acquires the secret, writes it into SSM via `setSsmParameterSecure`, and roundtrip-verifies, the
  exact write+verify twin of the github-app persist. the mech is orthogonal to the vault: aws.params
  supports reference, replica, AND github-app; all three share the `mechAdapterReplica` get path and
  split only at set. proven end-to-end by the `[case10]` CLI roundtrip (set via stdin → unlock → get
  returns the replica with `grade.protection: encrypted` → del reports the destroyed SSM secret).
