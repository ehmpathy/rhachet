# rule.require.os-secure-seals-to-host-manifest

## .what

`os.secure` credentials are each encrypted **to the same recipients as the host manifest**.
the manifest recipient is therefore not a property of one file — it is the shared seal over the
host manifest **and every `os.secure` credential beside it**.

so: **any change to the manifest recipients MUST re-key every `os.secure` credential in the
same operation.** you may never re-seal the manifest to a new recipient and leave the
`os.secure` blobs on the old one.

`os.direct` is NOT sealed to the recipients — `vaultAdapterOsDirect` stores a plaintext json
store (`keyrack.direct.json`), so it holds no recipient-encrypted blob and is never re-keyed
by a recipient change. only `os.secure` (age-encrypted, recipient-sealed) is in scope here.

## .why

`vaultAdapterOsSecure.set` encrypts each credential via
`encryptToRecipients({ recipients: context.hostManifest.recipients })`, and `.get` decrypts
it with the identity that opened the manifest. the credential files and the manifest share
one recipient set by construction.

if a migration (or a `recipient del`, or any re-key) changes the manifest recipient but does
not re-encrypt the owned-vault blobs:

- the next unlock derives/loads the **new** identity, opens the manifest fine,
- then hits an owned-vault blob still sealed to the **old** recipient,
- and fails: `no identity matched any of the file's recipients`.

this bricked the wisher's live keyrack on 2026-07-30: a legacy→derive-not-store migration
re-sealed the manifest to the derived `K` but left the `os.secure` credentials on the old ssh
recipient. the first fresh unlock opened the manifest and then failed on the first
credential. the manifest roundtrip test passed; the absent coverage was a credential sealed
to the old recipient.

## .the rule

| operation that changes manifest recipients | must also |
|---------------------------------------------|-----------|
| migration (legacy → derive-not-store) | re-encrypt every `os.secure` blob to the new recipient, in the same no-desync operation |
| `recipient set` / `recipient del` | re-encrypt every `os.secure` blob to the resulting recipient set |
| any re-key / rotation | re-encrypt every `os.secure` blob to the new recipient set |

the re-key reuses the identity from the **already-unlocked session** to decrypt the old blobs
(the operator has already proven possession of the old key), then re-encrypts to the new
recipients. refed vaults (`1password`, `aws.config`) are exempt — they store a pointer, not a
sealed secret, so no blob is re-keyed.

## .how — no-desync, all-or-none

a recipient change re-keys a set of files; a failure mid-way must never desync the manifest and
its credentials onto different recipients. two accepted mechanisms, strongest first:

1. **beside-then-flip (versioned)** — build the new set (new manifest + every re-keyed
   `os.secure` blob) **beside** the old, then make it current in one flip. a crash at any point
   leaves the old set whole. for migration this is v0 = `keyrack.host.age` (untouched), v1 =
   `keyrack.host.v1.age` (+ re-keyed blobs), current only when complete. this survives a hard
   `kill -9` mid-write and is the form to reach for when multiple writers or devices exist.
2. **snapshot-then-rollback** — snapshot the old set, mutate in place with the **manifest
   written LAST** as the completion marker, and on any thrown failure restore the snapshot so
   manifest and credentials never desync. this covers every in-process failure; the only
   residual is a hard `kill -9` in the write window, recoverable from the snapshot. acceptable
   for the single-user, one-time migration; not sufficient where concurrent writers exist.

either mechanism satisfies the invariant: **a failure must never leave the manifest on one
recipient and an `os.secure` blob on another.**

## .enforcement

- a recipient change that re-seals the manifest but not the `os.secure` blobs = **blocker**
- a migration/re-key test that asserts only the manifest roundtrip, with no `os.secure`
  credential sealed to the OLD recipient then opened after the change = **blocker** (this is
  the exact gap that shipped the brick)
- a re-key that mutates in place with NEITHER a beside-then-flip NOR a snapshot-then-rollback,
  so a failure can desync manifest and credentials = **blocker**

## .see also

- `define.vault-types-owned-vs-refed.md` — owned vaults store the secret; refed vaults store
  a pointer. only owned vaults are sealed to the manifest recipients.
- `rule.require.vault-roundtrip-verify.md` — verify a credential decrypts after any re-key.
- the keyrack-identity-unlock vision (`derive-not-store`, v0→v1 migration) — the design this
  invariant guards.
