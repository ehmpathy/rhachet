# F007 — a mock pem's frame is composed at runtime, so the secrets check stays strict

## .the fork

`.husky/check.secrets.sh` refuses any staged file whose text holds a contiguous pem key header,
with no exemption. five files this branch touches inline test keys (the two github-app acceptance
suites and `genTempPemFile` hold fake rsa pems; the manifest dao and ssh-identity integration tests
hold throwaway openssh keys made for the suite), so the commit is refused.

options:

1. compose the key frame at runtime in one shared fixture (`src/.test/assets/asTestKeyText.ts`,
   `kind: 'RSA' | 'OPENSSH'`); bodies kept byte for byte — 57 tests and 5 snapshots unchanged
2. generate a real throwaway rsa key at runtime — rejected: `osSecure` case8 needs a MALFORMED
   key on purpose, to prove an invalid key fails loud
3. add an exemption mark to the secrets check — rejected here: it weakens a security gate, a call
   for the gate's owner

## .taken — option 1

the scan keeps its full strength for every real key; only mock frames, composed in one fixture
whose docblock forbids a real key, avoid the literal. the mock bodies are unchanged, so every
assertion (the marker absent from stdout, the malformed-key failure) still holds.

## .rework

clean — one fixture and its callers.

## .confidence

88%. the residual risk is the shape itself: a split header could carry a real key past the scan.
the fixture's `.note` forbids it, and a reviewer sees every `asMockPemText` call.

## .verdict

settled by the driver, by reason. other mock-pem sites on main stay as they are until a change
touches them.
