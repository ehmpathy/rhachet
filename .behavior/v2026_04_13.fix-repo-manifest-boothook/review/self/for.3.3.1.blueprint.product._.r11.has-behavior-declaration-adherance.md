# self-review: has-behavior-declaration-adherance (round 11)

## question

does the blueprint adhere to the behavior declaration (vision + criteria)?

## methodology

1. read the vision yield line by line
2. read the criteria yield line by line
3. compare each requirement to blueprint implementation
4. flag deviations and fix them

---

## vision adherence: the outcome world

### before/after contrast

**vision describes the before:**

> role author ships the package. user runs `npx rhx init --roles designer`. role links.
> user starts a session. **no briefs boot.**
> the user's briefs and skills are linked in `.agent/` but never loaded into context. the role is silently useless.

**vision describes the after:**

> role author discovers the problem immediately. fixes it. ships functional roles.

**blueprint achieves this via:**

1. `assertRegistryBootHooksDeclared` throws `BadRequestError` before manifest generation (line 93 in codepath tree)
2. this happens at `repo introspect` time, not at runtime
3. the author cannot proceed to `rhachet.repo.yml` generation

**why this holds:** the insertion point (line 93: after `assertRegistrySkillsExecutable`, before orphan briefs check) ensures the guard runs before any manifest generation. a thrown error stops the process. no manifest = cannot publish = footgun prevented at build time.

### the "aha" moment

**vision describes:**

> the value clicks when a role author:
> 1. creates a role with briefs.dirs and skills.dirs
> 2. exports it in the registry
> 3. runs `npx rhachet repo introspect`
> 4. sees the failfast error
> 5. adds `hooks.onBrain.onBoot`
> 6. realizes "oh, this is how the boot hook gets registered on session start"

**blueprint supports this via:**

the error format (lines 209-230) teaches the pattern:
- "why:" section explains the mechanism
- "hint:" line gives the exact fix

**why this holds:** the error message is not just "you need X" but "here's why X matters and how to add it". this transforms an error into a chance to learn.

---

## vision adherence: error format

### turtle vibes treestruct

**vision prescribes exact format:**

```
🐢 bummer dude...

🔐 repo introspect
   └─ ✗ roles with bootable content but no boot hook

   these roles declare briefs or skills but lack hooks.onBrain.onBoot:

   ├─ acme/designer
   │  ├─ has: briefs.dirs, skills.dirs
   │  └─ hint: add hooks.onBrain.onBoot to register SessionStart boot
```

**blueprint matches this exactly (lines 209-230):**

| element | vision | blueprint |
|---------|--------|-----------|
| turtle emoji header | `🐢 bummer dude...` | ✓ matches |
| icon + command | `🔐 repo introspect` | ✓ matches |
| failure indicator | `└─ ✗ roles with bootable content but no boot hook` | ✓ matches |
| treestruct role list | `├─ acme/designer` | ✓ matches |
| has: line | `├─ has: briefs.dirs, skills.dirs` | ✓ matches |
| hint: line | `└─ hint: add hooks.onBrain.onBoot to register SessionStart boot` | ✓ matches |
| why: block | vision has 3-line explanation | ✓ blueprint has same |

**why this holds:** the blueprint's error message format section is a direct copy of the vision's example. no interpretation drift.

---

## vision adherence: bootable signal

**vision states the assumption:**

> **briefs.dirs / skills.dirs = bootable** — if declared, the role has content to boot. this is the signal.

**blueprint implements:**

```ts
const hasBriefsDirs = role.briefs?.dirs !== undefined;
const hasSkillsDirs = role.skills?.dirs !== undefined;
const hasBootableContent = hasBriefsDirs || hasSkillsDirs;
```

**why this holds:**

1. `!== undefined` catches both populated arrays and empty arrays `[]`
2. `||` correctly treats either dir type as bootable
3. this matches vision's "if declared" semantics — property presence, not content

**critical verification:** the vision says "declaration of dirs, not contents, is the signal". the blueprint uses `!== undefined` not `.length > 0`. an empty `briefs: { dirs: [] }` is still "declared" and will be caught.

---

## vision adherence: boot hook requirement

**vision states:**

> **hooks.onBrain.onBoot = the mechanism** — this is where the SessionStart hook is declared

**blueprint implements:**

```
hooks?.onBrain?.onBoot.length > 0
```

**why this holds:**

1. optional chain (`?.`) handles absent hooks/onBrain
2. `.length > 0` ensures at least one hook is declared
3. an empty array `[]` is not valid declaration (per criteria boundary)

**critical verification:** vision says hooks.onBrain.onBoot is "the mechanism". blueprint checks this exact path. no other path (like boot.uri) is required.

---

## criteria adherence: usecase by usecase

### usecase.1 = valid registry

**criteria:**
```
given(registry with roles that have bootable content and onBoot hooks)
  when(author runs `npx rhachet repo introspect`)
    then(introspect succeeds)
    then(rhachet.repo.yml is created)
```

**blueprint:**
- findRolesWithBootableButNoHook returns empty array for valid roles
- assertRegistryBootHooksDeclared does not throw when violations empty
- manifest generation proceeds

**why this holds:** valid roles satisfy `hasBootableContent && hasOnBootHook` or `!hasBootableContent`. neither case produces a violation.

### usecase.2 = invalid registry (briefs.dirs, no hook)

**criteria:**
```
given(registry with role that has briefs.dirs but no hooks.onBrain.onBoot)
  when(author runs `npx rhachet repo introspect`)
    then(introspect fails with exit code != 0)
    then(stderr lists the role slug)
    then(stderr shows which dirs are declared)
    then(stderr shows hint to add hooks.onBrain.onBoot)
    then(rhachet.repo.yml is NOT created)
```

**blueprint:**
- `hasBriefsDirs = true` when briefs.dirs declared
- `hasOnBootHook = false` when hooks absent
- violation collected: `{ roleSlug, hasBriefsDirs: true, hasSkillsDirs: false }`
- error message includes slug in treestruct
- error message includes "has: briefs.dirs"
- error message includes "hint: add hooks.onBrain.onBoot"
- BadRequestError prevents manifest

**why this holds:** the RoleBootHookViolation type (lines 196-200) captures exactly what criteria requires: roleSlug, hasBriefsDirs, hasSkillsDirs. error format uses these to build the message.

### usecase.3 = typed skills only (no boot needed)

**criteria:**
```
given(registry with role that has skills.solid but no briefs.dirs or skills.dirs)
  when(author runs `npx rhachet repo introspect`)
    then(introspect succeeds)
```

**blueprint:**
- only checks `role.briefs?.dirs` and `role.skills?.dirs`
- does NOT check `skills.solid` or `skills.rigid`

**why this holds:** the bootable signal is briefs.dirs OR skills.dirs. typed skills (solid/rigid) are imported directly via code, not discovered at boot time. blueprint correctly ignores them.

### usecase.4 = boot.yml curation (optional)

**criteria:**
```
given(registry with role that has briefs.dirs, hooks.onBrain.onBoot, but NO boot.uri)
  when(author runs `npx rhachet repo introspect`)
    then(introspect succeeds)
```

**blueprint:**
- does NOT check boot.uri presence
- only checks hooks.onBrain.onBoot

**why this holds:** vision states "boot.yml is optional curation". the guard validates the hook declaration, not the curation file. a role can have onBoot without boot.yml (will boot all content).

### usecase.5 = mixed registry

**criteria:**
```
given(registry with 3 roles: 2 valid, 1 with briefs.dirs but no onBoot)
  when(author runs `npx rhachet repo introspect`)
    then(stderr lists only the invalid role)
```

**blueprint:**
- findRolesWithBootableButNoHook iterates all roles
- only collects violations (invalid roles)
- valid roles are not collected

**why this holds:** the find operation returns an array of violations, not an array of all roles. valid roles satisfy the check and are skipped.

### usecase.6 = inits only (no boot needed)

**criteria:**
```
given(registry with role that has inits.exec but no briefs.dirs or skills.dirs)
  when(author runs `npx rhachet repo introspect`)
    then(introspect succeeds)
```

**blueprint:**
- only checks briefs.dirs and skills.dirs
- does NOT check inits.exec

**why this holds:** inits are one-time execution scripts, not session boot content. vision clarifies: "briefs.dirs / skills.dirs = bootable". inits are a different concern.

### usecase.7 = empty registry

**criteria:**
```
given(registry with zero roles)
  when(author runs `npx rhachet repo introspect`)
    then(introspect succeeds)
```

**blueprint:**
- iterates registry.roles (empty array)
- violations array is empty
- no throw

**why this holds:** no roles = no violations = assertion passes. edge case handled naturally.

---

## criteria adherence: boundary conditions

### empty briefs.dirs array []

**criteria:**
```
given(role with empty briefs.dirs array [])
  when(author runs `npx rhachet repo introspect`)
    then(introspect requires onBoot hook)
```

**blueprint:**
```ts
const hasBriefsDirs = role.briefs?.dirs !== undefined;
```

**why this holds:** `[] !== undefined` is `true`. empty array is still a declaration. blueprint correctly catches this.

### empty onBoot array []

**criteria:**
```
given(role with hooks.onBrain.onBoot that is empty array [])
  when(author runs `npx rhachet repo introspect`)
    then(introspect fails)
```

**blueprint:**
```
hooks?.onBrain?.onBoot.length > 0
```

**why this holds:** `[].length > 0` is `false`. empty onBoot is not valid declaration. blueprint correctly rejects this.

---

## deviations found

none. every vision requirement and criteria usecase is satisfied by the blueprint.

---

## summary

| source | items checked | adhered |
|--------|---------------|---------|
| vision: outcome world | 3 aspects | 3/3 |
| vision: error format | 6 elements | 6/6 |
| vision: bootable signal | 1 definition | 1/1 |
| vision: boot hook | 1 definition | 1/1 |
| criteria: usecases | 7 | 7/7 |
| criteria: boundaries | 2 | 2/2 |

all requirements traced to specific blueprint lines. no deviations.

**verdict:** **pass** — blueprint adheres to behavior declaration

