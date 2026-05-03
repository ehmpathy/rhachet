# rule.forbid.key-persistence-leak

## .what

the key→persistence relationship is sensitive. we never leak which key resolves to which persisted resource.

## .why

the key→persistence lookup is itself a privilege escalation:

- if attacker knows "slug X resolves to profile Y in ~/.aws/config", they target their next step
- if attacker knows "slug A resolves to 1password item B", they know where to attack
- enumeration of lookups reveals the security architecture

therefore, we say:

| allowed | forbidden |
|---------|-----------|
| "does the host know? yes/no" | "slug X resolves to profile Y" |
| "N keys are configured" | "key A is in vault B" |
| slug-hash (one-way) | slug→exid lookup |

## .pattern

inventory entries are stored at `~/.rhachet/keyrack/inventory/owner={owner}/{slug-hash}.stocked`

inventory is vault-agnostic. it answers "was this key set?" — not "in which vault?"

inventory lifecycle is in lockstep with keyrack set/del:
- `keyrack set` stocks entry (after host manifest)
- `keyrack del` removes entry (last, after host manifest deletion)

deletion order matters: delete entry last so orphan entries show "locked" (recoverable) rather than "absent" (misleads user).

.stocked files must:
- be empty (zero bytes)
- use slug-hash (one-way, reveals no key name)
- store no exid, no profile name, no vault path
- directory chmod 700, file chmod 600 (prevents enumeration by other users)

status checks answer only:
- stocked → locked (host knows)
- not stocked → absent (host doesn't know)

## .enforcement

- .stocked file with content = blocker
- slug→persistence lookup in any file = blocker
- exid in inventory entry = blocker
- inventory directory not chmod 700 = blocker
- .stocked file not chmod 600 = blocker
- entry deleted before host manifest = blocker

## .see also

- `define.vault-types-owned-vs-refed` — owned vs refed vault distinction
