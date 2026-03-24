# self-review r3: has-pruned-backcompat

## the question

did we add backwards compatibility that was not explicitly requested?

---

## scan for backwards-compat patterns

### 1. default value for --owner

```ts
.option('--owner <owner...>', 'owner(s) to fill (default: default)', ['default'])
```

**is this backwards-compat?** no. this is a default value, not backwards-compat. the vision explicitly states: "given --owner not specified, then defaults to owner=default."

**verdict:** explicitly requested.

### 2. fallback to os.secure vault

```ts
const vault = keySpec?.vault ?? vaultInferred ?? 'os.secure';
```

**is this backwards-compat?** no. this is a fallback for unspecified vaults, not backwards-compat with an old system.

**evidence from wish:** "fallback to replica os.secure when not prescribed and not inferrable"

**verdict:** explicitly requested.

### 3. fallback to PERMANENT_VIA_REPLICA mech

```ts
const mech = keySpec?.mech ?? mechInferred ?? 'PERMANENT_VIA_REPLICA';
```

**is this backwards-compat?** no. this is a fallback when mech cannot be inferred, not backwards-compat.

**evidence:** when vault is os.secure and mech is not specified, PERMANENT_VIA_REPLICA is the only valid mech.

**verdict:** required by logic, not backwards-compat.

### 4. prikey discovery (null first)

```ts
const prikeysToTry = [null, ...input.prikeys];
```

**is this backwards-compat?** no. this implements the wish: "extends the set of prikeys we should consider (ontop of the discovered ones)."

**verdict:** explicitly requested.

---

## scan for deprecated API preservation

### did we preserve any old APIs?

**no.** this is a new command (`keyrack fill`). there is no prior implementation to maintain backwards-compat with.

### did we preserve any old CLI flags?

**no.** all flags are new for this command.

### did we preserve any old file formats?

**no.** we reuse extant keyrack.yml format, which is not changed by this feature.

---

## scan for "just in case" safety code

### did we add try/catch "just in case"?

**no.** the only try/catch in the blueprint is for prikey iteration, which is required behavior (try each prikey until one works).

### did we add optional params "just in case"?

**no.** all params serve explicit purposes from wish/vision.

### did we add migrations or adapters "just in case"?

**no.** this is a new feature, no migrations needed.

---

## conclusion

**no backwards-compat concerns found.** this is a new command with no prior implementation. all defaults and fallbacks are explicitly requested in wish/vision, not added "to be safe."

| pattern | type | verdict |
|---------|------|---------|
| --owner default | default value | explicitly requested |
| os.secure fallback | fallback | explicitly requested |
| PERMANENT_VIA_REPLICA fallback | fallback | required by logic |
| prikey discovery first | behavior | explicitly requested |
| old API preservation | n/a | no old API exists |
| migrations | n/a | new command |

