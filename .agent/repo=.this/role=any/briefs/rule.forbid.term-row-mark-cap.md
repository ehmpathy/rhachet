# rule.forbid.term-row-mark-cap

> **`row`, `mark`, and `cap` are forbidden in names, fields, test titles, stdout, and comments.
> each hides a domain noun behind a container or a gesture. say the noun.**

| 👎 term | what it hid | 👍 say |
|---|---|---|
| `row` | an element of a `keys: [...]` list | **key** — `DaemonStatusKey` |
| `mark` / `marked` / `unmarked` | a renewal's stopped state | **status** — `renewal.status: 'lapsed' \| 'halted'`; an `on` entry |
| `cap` / `capped` / `at cap` | the latest moment a renewal may extend a grant to | **max** — `expiresAtMax`; `isRenewalEntryAtMax`; `renewal = off` |

## .why

- **`row`** is a table word. the socket sends keys; `row` names the shape around them. the
  wire/domain seam it was coined to guard is held by the `Daemon…` prefix and a compile clamp,
  never by the word (`term=row._.choice.reason.md`, dispute resolved)
- **`mark`** is a gesture, never a state. "a key the renew has marked" forces the reader to ask
  marked *as what*; `status = lapsed` answers before the question
- **`cap`** is a synonym for an expiry the domain already names. `expiresAt` and `expiresAtMax`
  sit side by side; a third word for the second one splits one concept across two names

## .the test

> **could a reader ask "a ___ of what?" or "marked as what?"**

yes → the term hid a noun. write the noun.

## .the boundary

| a violation | not a violation |
|---|---|
| a new or touched identifier, field, test title, stdout line, or comment with the term | english idiom — "ten faults in a row" |
| | `mark` as a verb in an unrelated subsystem (`daemonActivityClock` marks demand) |
| | an extant line on main that this change does not touch — fix forward on contact |

blocker: a forbidden term in a name, field, or stdout this change adds.
nitpick: a forbidden term in a comment or test title this change adds.

⇒ see also: `term=row._.choice._.md` · `rule.forbid.domain-term-synonyms` (learner) ·
`rule.require.ubiqlang` (mechanic).
