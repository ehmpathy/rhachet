# define.aws-export-cache

> **an aws.config key's `aws configure export-credentials` runs once per profile per box. its result
> rests in an owner-only file until 15 minutes before the creds expire.**

## .what

| | |
|---|---|
| where | `~/.rhachet/keyrack/cache/aws.export/profile=$profile.$sha8.json`, 0600 in a 0700 dir |
| what | the exported creds (plaintext, as `~/.aws/cli/cache` holds them) and their expiry |
| key | the profile, the config and credentials file paths (`AWS_CONFIG_FILE`, `AWS_SHARED_CREDENTIALS_FILE`, else their defaults), and both files' content |
| fresh | more than 15 min left (the window botocore refreshes within); else a re-export |
| lock | one export per key at a time, behind a disk mutex in the cache dir's `.locks/`; a waiter prints one stderr notice |
| op | `genAwsProfileExport` (`src/domain.operations/keyrack/adapters/mechanisms/aws.sso/`) |

## .what drops it

- `rhx keyrack relock` drops every entry of each aws.config key it purges: `relockKeyrack` reads the
  held grant's profile before the purge, then calls `delAwsProfileExport`
- the aws.config vault's `relock` drops every entry of its profile too, by the manifest's exid
- an entry whose grant the daemon no longer holds (expired, daemon killed) is not dropped by a cli
  relock; it is never served past its expiry, and rests until a relock of its profile
- an entry past its expiry is never served

⇒ to purge by hand: remove `~/.rhachet/keyrack/cache/aws.export/`. the next unlock re-exports.

## .when it fails

a fault of the cache dir is a `ConstraintError`, exit 2, whose unlock row names the cure that fits:
- a file where a dir belongs, or a dir where a file belongs → `— fix: move aside the entry at or above <path> …`
- not writable, or root-owned after a `sudo rhx` → `— fix: make <path> readable and writable …`

## .see also

- `define.vault-mech-adapters` — the aws.config vault and the `EPHEMERAL_VIA_AWS_SSO` mech
- `rule.forbid.key-persistence-leak` — why the file is owner-only and never logged
