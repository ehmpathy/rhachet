# self-review: has-questioned-assumptions

## assumption 1: os.daemon keys need no host manifest entry

### what do we assume?
that os.daemon keys are "pure ephemeral" and should not be recorded in the host manifest.

### what evidence supports this?
the wish says "without persistent storage in any vault" — interpreted as no disk persistence.

### what if the opposite were true?
if os.daemon keys had manifest entries:
- `keyrack status` could show them
- `keyrack unlock --env test` could skip re-prompt
- the key would survive daemon restart (but still need secret re-entry)

### did the wisher actually say this?
no. the wisher said "without persistent storage" but didn't specify manifest behavior. we inferred no manifest entry.

### counterexamples?
`os.direct` stores secrets on disk but also has manifest entries. manifest entry != permanent secret storage.

### verdict: assumption may be wrong

**issue:** we assumed "ephemeral secret" means "no manifest entry". but the manifest could track that a key exists in os.daemon (with no secret), similar to how 1password stores exid.

**question for wisher:** should os.daemon keys have manifest entries? options:
- option a: no entry — pure ephemeral, invisible to status
- option b: entry with `vault: os.daemon` — visible, but no secret stored

---

## assumption 2: 1password set should prompt for exid

### what do we assume?
that set should prompt user to enter the exid (secret reference uri).

### what evidence supports this?
the wish says "set into the host manifest the exid of where to find the key within 1password."

### what if the opposite were true?
if we didn't prompt for exid:
- could derive exid from convention (e.g., `op://keyrack/{env}/{key}`)
- could use guided picker to select from 1password items

### did the wisher actually say this?
no, the wisher didn't specify how exid is obtained. we assumed manual entry.

### counterexamples?
aws.iam.sso uses guided setup when no exid is provided. 1password could do similar.

### verdict: assumption holds but alternatives exist

**non-issue:** manual exid entry is simplest for v1. guided picker could be future enhancement.

---

## assumption 3: 1password cli is the only interface

### what do we assume?
that `op` cli is the way to interact with 1password.

### what evidence supports this?
the wish says "leverage the 1password cli" explicitly.

### what if the opposite were true?
- 1password connect api: no local install needed
- 1password sdk: native integration

### did the wisher actually say this?
yes, explicitly: "leverage the 1password cli (or sdk?)".

### verdict: assumption holds

**non-issue:** wisher confirmed cli is the interface. sdk is mentioned as alternative but cli is primary.

---

## assumption 4: biometric auth is acceptable ux

### what do we assume?
that biometric prompts from 1password are acceptable.

### what evidence supports this?
industry standard — biometric is secure and fast.

### what if the opposite were true?
if biometric is unacceptable:
- could cache 1password session longer
- could use master password instead
- could require service account only

### did the wisher actually say this?
no. we assumed biometric is fine because it's standard.

### counterexamples?
ci environments can't do biometric — hence OP_SERVICE_ACCOUNT_TOKEN support.

### verdict: assumption holds with ci caveat

**non-issue:** biometric for local dev, service account for ci. both are covered.

---

## assumption 5: 9h default ttl for os.daemon

### what do we assume?
that keys set via os.daemon should expire in 9 hours.

### what evidence supports this?
extant os.daemon unlock uses 9h default (from code: `9 * 60 * 60 * 1000`).

### what if the opposite were true?
- shorter ttl: more secure, more friction
- longer ttl: less friction, less secure
- no ttl: until daemon dies

### did the wisher actually say this?
no. we assumed consistency with extant behavior.

### verdict: assumption holds

**non-issue:** 9h matches workday. daemon death = keys gone anyway.

---

## assumption 6: op read works with service accounts

### what do we assume?
that `op read` command works in ci with OP_SERVICE_ACCOUNT_TOKEN.

### what evidence supports this?
1password documentation suggests it does, but we haven't verified.

### what if the opposite were true?
ci integration would fail. alternative: use op connect api.

### did the wisher actually say this?
wisher mentioned ci scenario but didn't specify mechanism.

### verdict: assumption needs validation

**issue:** need external research to confirm `op read` works with service accounts.

---

## hidden assumptions surfaced

### assumption 7: vaults must support all operations uniformly

we assumed all vaults should support set/unlock/get/del uniformly. but:
- 1password doesn't support del (read-only from keyrack perspective)
- os.daemon set is different from os.secure set (no manifest entry assumed)

**question:** is it okay for vaults to have asymmetric capabilities?

### assumption 8: set command determines vault type

we assumed `keyrack set --vault X` is the interface. but os.daemon set already exists in adapter — what blocks it today? we assumed CLI change needed without verified evidence.

**action:** verify what actually blocks `keyrack set --vault os.daemon` today.

---

## summary

| assumption | verdict | action needed |
|------------|---------|---------------|
| no manifest for os.daemon | may be wrong | ask wisher |
| prompt for exid | holds | none |
| op cli interface | holds | none |
| biometric ux acceptable | holds | none |
| 9h default ttl | holds | none |
| op read + service accounts | needs validation | external research |
| uniform vault operations | questionable | document asymmetries |
| CLI blocks os.daemon | needs verification | check CLI code |
