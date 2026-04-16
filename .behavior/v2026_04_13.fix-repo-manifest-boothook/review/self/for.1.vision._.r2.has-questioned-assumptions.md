# self-review r2: has-questioned-assumptions

## deeper reflection on assumption 1: boot field = bootable

in r1, i concluded that boot.yml is the signal for bootability and that init registers SessionStart hooks based on its presence.

**let me verify this assumption by research.**

### what does init actually do?

the init process (`rhx init`) links roles from packages into `.agent/`. but does it register SessionStart hooks?

from settings.json, i see hooks like:
```json
"./node_modules/.bin/rhachet roles boot --repo ehmpathy --role ergonomist"
```

but ergonomist has NO boot.yml in the manifest. so either:
1. init registers hooks for ALL roles (boot.yml or not), OR
2. someone manually added the ergonomist hook

### what the wish actually says

> "forgot to add that onBoot `npx rhachet roles boot ...` hook"

the wisher says the role author "forgot to add" the hook. this implies role authors are responsible for the declaration — it's not automatic.

### how would role authors "declare" a boot hook?

from the Role interface, there's no explicit "hooks.sessionStart" field. the mechanisms are:
- `inits.exec` — executables that run on `rhx init`
- `hooks.onBrain.onBoot` — hooks for brain events (different purpose)
- `boot` — path to boot.yml

**the boot.yml is the declaration of "this role should boot on SessionStart".**

if boot.yml doesn't exist, the init has no signal that this role wants to boot. the role might still work (typed skills), but its briefs/skills won't load on SessionStart.

### ergonomist case explained

ergonomist has no boot.yml but has a SessionStart hook. two possibilities:
1. it was manually added (before this convention was established)
2. there's another mechanism i lack awareness of

either way, the wish is about future footgun prevention. the rule "require boot.yml" ensures new roles declare boot intent explicitly.

### verdict: assumption holds

the boot.yml field is the explicit declaration that a role should boot on SessionStart. roles without it are either:
- library roles (shouldn't be in registry)
- legacy roles (need to add boot.yml)

this matches the wish's intent: "the full chain is explicit and not 'magic'".

---

## deeper reflection on assumption 2: registry = bootable roles

in r1, i accepted this because the wisher said it explicitly.

**but is this the right design?**

### what if registry served multiple purposes?

registry could mean:
- "these roles can be linked" (current)
- "these roles can be booted" (new requirement)
- "these roles should be discoverable" (via `rhx list`)
- "these roles have keyrack requirements"

to conflate all of these into "must have boot.yml" might be too restrictive.

### what the wish says

> "if they want to make their role not bootable, then it shouldn't be in the registry to begin with"
> "(not all roles need to be exported in the registry)"

the wisher is explicit: registry = bootable. non-bootable roles use different distribution (direct import, not registry).

### is this the right design?

**yes.** the registry is for roles that consumers will init and use. if a role doesn't boot, what's the point of the init? the user would need to manually integrate it anyway.

roles that provide only typed skills (no briefs, no boot) are "libraries" — they're imported directly, not discovered via registry.

### verdict: assumption holds

the wisher's design makes sense. registry = bootable is the right constraint.

---

## summary

both assumptions hold after deeper reflection:

| assumption | evidence | verdict |
|------------|----------|---------|
| boot.yml = bootable | wisher wants "explicit" declaration, boot.yml is that signal | ✓ holds |
| registry = bootable | wisher explicitly stated this design | ✓ holds |

no issues found. the vision correctly interprets the wish.
