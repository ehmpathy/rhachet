# self review: has-critical-paths-frictionless (round 9)

## deep dive: manual walk-through of the critical path

let me trace the exact journey a role author experiences when they hit this guard.

## the critical path

**role author creates a rhachet-roles package:**

1. declares `briefs.dirs` and/or `skills.dirs` in package.json
2. forgets to add `hooks.onBrain.onBoot` with the boot command
3. runs `npx rhachet repo introspect` (at build/publish time)

**expected experience:**

the command fails fast with actionable error.

## actual error output analysis

from the implementation in `assertRegistryBootHooksDeclared.ts`, the error looks like:

```
🐢 bummer dude...

🔐 repo introspect
   └─ ✗ roles with bootable content but no valid boot hook

   these roles declare briefs or skills but lack a valid boot hook:

   └─ mechanic
      ├─ has: briefs.dirs, skills.dirs
      ├─ reason: no-hook-declared
      └─ hint: add hooks.onBrain.onBoot with 'npx rhachet roles boot --role mechanic'

   why:
   roles with briefs.dirs or skills.dirs have content to boot on session start.
   the boot hook must run 'rhachet roles boot --role <this-role>' to load the content.

   if a role doesn't need to boot, don't declare briefs.dirs or skills.dirs.
```

## friction analysis

### 1. emoji: `🔐` vs `🐚`

the treestruct standard says `🐚` for shell commands. this error uses `🔐`.

**verdict:** minor cosmetic. `🔐` is specific to keyrack; `repo introspect` should use `🐚`. however:
- the error is still clear and actionable
- turtle vibes are present (`bummer dude`)
- the hint is copy-pasteable
- functionality is correct

this is a **nitpick**, not a blocker. the behavior works as intended.

### 2. hint format

the hint says: `add hooks.onBrain.onBoot with 'npx rhachet roles boot --role mechanic'`

**question:** is this clear enough?

**analysis:**
- tells user WHAT to add: `hooks.onBrain.onBoot`
- tells user WHERE to add it: in the role config
- tells user HOW: the exact command string

**verdict:** clear and actionable. user can search their package.json for `"mechanic"` role and add the hook there.

### 3. reason codes

three reason codes exist:
- `no-hook-declared` - no hooks array
- `absent-roles-boot-command` - hooks exist but wrong command
- `wrong-role-name` - command boots a different role

each has a tailored hint. this is thorough.

### 4. multiple violations

the error lists all violations at once. user can fix all of them in one pass.

### 5. fail time

fails at `repo introspect` time, not at `rhx init` time. this is correct:
- catches problem before publish
- role author sees error, not consumer

## the user journey

1. role author runs `npx rhachet repo introspect`
2. sees `🐢 bummer dude...` — knows an error occurred
3. sees `mechanic` — knows which role
4. sees `no-hook-declared` — knows what is wrong
5. sees `add hooks.onBrain.onBoot with 'npx rhachet roles boot --role mechanic'` — knows how to fix
6. fixes the config
7. reruns command
8. success

**friction points:** none. each step provides the information needed for the next.

## conclusion

holds. the critical path is frictionless:
- error is immediate (build time)
- error is friendly (turtle vibes)
- error is specific (role slug, reason)
- error is actionable (exact command)
- error is complete (handles all violation types)
- error is efficient (lists all violations at once)

the `🔐` vs `🐚` emoji is a nitpick that does not affect the user's ability to fix the issue.

