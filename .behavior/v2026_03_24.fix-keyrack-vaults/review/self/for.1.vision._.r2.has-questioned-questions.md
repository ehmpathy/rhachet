# self-review r2: has-questioned-questions

## triage of open questions

### question 1: os.daemon manifest persistence?

> should os.daemon keys persist to host manifest?

**can this be answered via logic now?** yes.
**can this be answered via extant docs or code now?** yes — the wish says explicitly "without persistant storage in any vault".

**verdict: [answered]**

os.daemon keys have NO manifest entry. the wish is explicit. "without persistent storage" means pure ephemeral — daemon memory only.

---

### question 2: os.daemon unlock behavior?

> does `unlock --env test` re-prompt for os.daemon keys? or are they "already unlocked" by nature?

**can this be answered via logic now?** yes.

if keys are set directly to os.daemon:
- they're already in daemon memory
- `unlock --env test` should report them as "already unlocked"
- no re-prompt needed

**verdict: [answered]**

unlock for os.daemon keys reports "already unlocked" and skips. no re-prompt.

---

### question 3: 1password exid validation?

> validate format `op://vault/item/field` on set? or validate via test read?

**can this be answered via logic now?** partially.
**does only the wisher know the answer?** yes — this is a ux decision.

options:
- a: validate only `op whoami` on set (installed + authed), defer exid validation to unlock
- b: validate `op read $exid` on set (reveals secret earlier)

**recommendation:** option a — don't fetch secrets at set time. unlock is when secrets flow.

**verdict: [wisher]** — but with recommendation.

---

### question 4: 1password guided setup?

> list user's vaults and items for picker? or require user to know the exid upfront?

**can this be answered via logic now?** yes.

v1 = manual exid entry. guided picker is scope creep for initial implementation. can add later.

**verdict: [answered]**

manual exid entry for v1. guided picker is future enhancement.

---

### question 5: op cli capabilities

> confirm `op read` works with service accounts

**should this be answered via external research later?** yes.

need to verify 1password documentation that `OP_SERVICE_ACCOUNT_TOKEN` works with `op read`.

**verdict: [research]**

---

### question 6: op cli auth modes

> document biometric vs master password vs service account

**should this be answered via external research later?** yes.

need to document all auth modes for user guidance.

**verdict: [research]**

---

### question 7: op cli error codes

> map errors to helpful keyrack messages

**should this be answered via external research later?** yes.

need to understand op cli error output to provide clear failure messages.

**verdict: [research]**

---

## summary

| question | verdict | action |
|----------|---------|--------|
| os.daemon manifest? | [answered] | no manifest entry |
| os.daemon unlock? | [answered] | report "already unlocked" |
| exid validation on set? | [wisher] | recommend defer to unlock |
| guided picker? | [answered] | v1 = manual, future = picker |
| op read + service accounts? | [research] | external research phase |
| op auth modes? | [research] | external research phase |
| op error codes? | [research] | external research phase |

---

## updates to vision

need to update vision document `1.vision.md` to reflect these triaged answers under "open questions & assumptions".
