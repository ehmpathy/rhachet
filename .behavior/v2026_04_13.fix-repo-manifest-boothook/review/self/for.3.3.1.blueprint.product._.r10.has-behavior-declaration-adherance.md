# self-review: has-behavior-declaration-adherance (round 10)

## question

does the blueprint adhere to the behavior declaration (vision + criteria)?

## methodology

1. read the vision yield line by line
2. read the criteria yield line by line
3. compare each requirement to blueprint implementation
4. flag deviations and fix them

---

## vision adherence

### error format comparison

**vision prescribes:**

```
🐢 bummer dude...

🔐 repo introspect
   └─ ✗ roles with bootable content but no boot hook

   these roles declare briefs or skills but lack hooks.onBrain.onBoot:

   ├─ acme/designer
   │  ├─ has: briefs.dirs, skills.dirs
   │  └─ hint: add hooks.onBrain.onBoot to register SessionStart boot
   │
   └─ acme/tester
      ├─ has: briefs.dirs
      └─ hint: add hooks.onBrain.onBoot to register SessionStart boot

   why:
   roles with briefs.dirs or skills.dirs have content to boot on session start.
   without hooks.onBrain.onBoot, the content is linked but never loaded.

   if a role doesn't need to boot, don't declare briefs.dirs or skills.dirs.
```

**blueprint prescribes:**

the error message format section (lines 207-230) matches this format exactly:
- turtle emoji header ✓
- 🔐 repo introspect header ✓
- role slug listed ✓
- "has:" line with briefs.dirs and/or skills.dirs ✓
- "hint:" line with fix suggestion ✓
- "why:" explanation block ✓

**verdict:** adheres — error format matches vision

### before/after contrast

**vision describes:**

before: silent failure where roles link but never boot
after: failfast at build time with actionable error

**blueprint achieves:**

- `assertRegistryBootHooksDeclared` throws `BadRequestError` ✓
- insertion point before manifest generation (line 241) ✓
- prevents `rhachet.repo.yml` from creation ✓

**verdict:** adheres — failfast behavior matches vision

### bootable signal

**vision specifies:**

> briefs.dirs / skills.dirs = bootable — if declared, the role has content to boot

**blueprint implements:**

```ts
const hasBriefsDirs = role.briefs?.dirs !== undefined;
const hasSkillsDirs = role.skills?.dirs !== undefined;
const hasBootableContent = hasBriefsDirs || hasSkillsDirs;
```

**verdict:** adheres — property presence check matches vision

### boot hook requirement

**vision specifies:**

> hooks.onBrain.onBoot = the mechanism

**blueprint implements:**

```
hooks?.onBrain?.onBoot.length > 0
```

this correctly requires:
1. hooks to be defined
2. onBrain to be defined
3. onBoot array to have at least one entry

**verdict:** adheres — hook check matches vision

---

## criteria adherence

### usecase.1 = valid registry

| criteria | blueprint |
|----------|-----------|
| introspect succeeds | findRolesWithBootableButNoHook returns empty, no throw |
| rhachet.repo.yml created | assertion passes, manifest generates |

**verdict:** adheres

### usecase.2 = invalid registry (briefs.dirs, no hook)

| criteria | blueprint |
|----------|-----------|
| exit != 0 | BadRequestError thrown |
| stderr lists role slug | violation.roleSlug in message |
| stderr shows which dirs | hasBriefsDirs, hasSkillsDirs in violation |
| stderr shows hint | "hint:" line in error format |
| manifest NOT created | throw prevents generation |

**verdict:** adheres

### usecase.3 = typed skills only

| criteria | blueprint |
|----------|-----------|
| introspect succeeds | role not flagged (no briefs.dirs or skills.dirs) |
| manifest created | no violation, proceeds |

**verdict:** adheres

### usecase.4 = boot.yml curation

| criteria | blueprint |
|----------|-----------|
| boot.yml optional | not checked — boot.yml is curation, not declaration |
| still requires onBoot hook | hooks.onBrain.onBoot checked regardless of boot.uri |

**verdict:** adheres — blueprint correctly ignores boot.yml presence (it's orthogonal)

### usecase.5 = mixed registry

| criteria | blueprint |
|----------|-----------|
| introspect fails | one bad role triggers throw |
| lists only invalid | find returns only violations |

**verdict:** adheres

### usecase.6 = inits only

| criteria | blueprint |
|----------|-----------|
| introspect succeeds | inits.exec not checked for bootable |
| manifest created | no briefs.dirs/skills.dirs = no violation |

**verdict:** adheres — blueprint only checks briefs.dirs and skills.dirs

### usecase.7 = empty registry

| criteria | blueprint |
|----------|-----------|
| introspect succeeds | empty registry → empty violations |
| manifest created | no violations, proceeds |

**verdict:** adheres

---

## boundary adherence

### empty briefs.dirs array

| criteria | blueprint |
|----------|-----------|
| requires onBoot hook | `role.briefs?.dirs !== undefined` catches `[]` |

**verdict:** adheres — presence check, not content check

### empty onBoot array

| criteria | blueprint |
|----------|-----------|
| introspect fails | `hooks?.onBrain?.onBoot.length > 0` requires entries |

**verdict:** adheres — empty array is not valid declaration

---

## deviations found

none. the blueprint adheres to the vision and criteria.

---

## summary

| source | requirements | adhered |
|--------|--------------|---------|
| vision: error format | 6 elements | 6 (100%) |
| vision: behavior | 4 aspects | 4 (100%) |
| criteria: usecases | 7 | 7 (100%) |
| criteria: boundaries | 2 | 2 (100%) |

no deviations detected. blueprint adheres to behavior declaration.

**verdict:** **pass** — full adherence to vision and criteria

