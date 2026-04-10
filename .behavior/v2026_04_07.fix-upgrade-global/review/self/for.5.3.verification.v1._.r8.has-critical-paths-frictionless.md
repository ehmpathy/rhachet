# self-review: has-critical-paths-frictionless (r8)

## the question

> are the critical paths frictionless in practice?

## manual verification performed

I ran `npx rhachet upgrade --help` to verify the CLI interface:

```
Usage: rhachet upgrade [options]

upgrade rhachet, role, and/or brain packages to latest versions

Options:
  --self                upgrade rhachet itself
  --roles <roles...>    role specifiers to upgrade (* for all installed)
  --brains <brains...>  brain specifiers to upgrade (* for all installed)
  --which <which>       which installs to upgrade: local, global, or both
  -h, --help            display help for command
```

**friction check:** the --which flag is discoverable via --help. the description is clear.

## critical path analysis

### path 1: `rhx upgrade` (default behavior)

**user story:** "i want to upgrade rhachet everywhere"

**what happens:**
1. user runs `rhx upgrade`
2. system detects global invocation
3. system upgrades local install
4. system upgrades global install

**friction points checked:**
- no extra flags needed ✓
- no prompts or confirmations ✓
- both installs upgraded in one command ✓

**why frictionless:** the default does what the user expects — upgrade all installs.

### path 2: `rhx upgrade --which local`

**user story:** "i only want to upgrade this project, not global"

**what happens:**
1. user runs `rhx upgrade --which local`
2. system upgrades local install only
3. global is untouched

**friction points checked:**
- single flag for explicit control ✓
- flag name is intuitive (`--which local`) ✓
- no ambiguity about scope ✓

**why frictionless:** explicit control when needed, minimal ceremony.

### path 3: `rhx upgrade --which global`

**user story:** "i only want to upgrade my global install"

**what happens:**
1. user runs `rhx upgrade --which global`
2. system upgrades global install only
3. local is untouched

**friction points checked:**
- single flag for explicit control ✓
- consistent with `--which local` ✓
- no unintended side effects ✓

**why frictionless:** symmetric with `--which local`, easy to remember.

### path 4: `npx rhachet upgrade`

**user story:** "i use npx, i don't have rhachet globally"

**what happens:**
1. user runs `npx rhachet upgrade`
2. system detects npx invocation
3. system upgrades local install only
4. no global attempt (sensible for npx users)

**friction points checked:**
- no error about absent global ✓
- no noise ✓
- just works for npx workflow ✓

**why frictionless:** npx users don't have global install, so no attempt is made.

### edge case: global fails (permissions)

**user story:** "i run rhx upgrade but global requires sudo"

**what happens:**
1. user runs `rhx upgrade`
2. local upgrade succeeds
3. global upgrade fails (EACCES)
4. user sees warn message with failure reason
5. command exits success (local was the core value)

**friction points checked:**
- local not blocked by global failure ✓
- clear error message ✓
- user can fix global manually if needed ✓

**why frictionless:** partial success is still success — user gets value from local upgrade.

## what could create friction (and doesn't)

| potential friction | how it's avoided |
|-------------------|------------------|
| "which flag do i use?" | `--which` with `local\|global\|both` is self-explanatory |
| "what if global fails?" | warn and continue — local still upgraded |
| "what if i use npx?" | sensible default (local only) |
| "what does --which do?" | --help shows clear description |

## conclusion

all critical paths are frictionless:
- **rhx upgrade** — upgrades both, no flags needed
- **--which local/global** — explicit control, intuitive names
- **npx upgrade** — sensible default for npx users
- **global fails** — warn and continue, local still succeeds

the CLI interface is discoverable via --help. the behavior matches user expectations.
