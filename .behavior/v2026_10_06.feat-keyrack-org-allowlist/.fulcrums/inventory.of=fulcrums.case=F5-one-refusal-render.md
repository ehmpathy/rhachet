# F5 — one refusal render for scalar and list manifests

**the fork** — wish §the shape, 3: "its message names the allowlist rather than one word". (a) a scalar manifest keeps today's `does not match manifest org 'x'`; a list gets a new line · (b) one render for both: `--org 'x' is not on this manifest's org allowlist`, metadata `orgsOfManifest`, hint lists the members and the "add it to org:" fix.

**taken** — (b). `asKeyrackOrgMismatchRefusal` exists because three sites drifted to three renders; two renders by manifest shape would re-open that. and a scalar repo is exactly where the hint "add it to org:" teaches the door instead of the swap.

the error `code` stays `ORG_MISMATCH`, so a programmatic caller sees no change.

**rework** — clean. one transformer; snapshots in `keyrack.org-mismatch.acceptance.test.ts` change.

**confidence** — 70%. the exact words are a taste call, and an extant snapshot changes for scalar repos.

**where** — `case=5`.

**verdict** — open.
