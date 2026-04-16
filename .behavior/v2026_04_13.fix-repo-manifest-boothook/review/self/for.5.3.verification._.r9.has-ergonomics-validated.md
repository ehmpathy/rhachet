# self review: has-ergonomics-validated (round 9)

## pause and question

the prior review claimed "no drift occurred." let me question this more critically.

## what the wish actually says

> "this failfast will prevent a common footgun at build time"

the key word is **footgun**. the wish identifies a specific problem:
- role author creates role with bootable content
- forgets to add boot hook
- role is published
- consumer runs `rhx init`
- role fails to boot silently (or errors cryptically)
- consumer is confused

## does the implementation prevent this footgun?

**step through the scenario:**

1. role author creates `rhachet-roles-foo` package
2. declares `briefs.dirs` in mechanic role
3. forgets `hooks.onBrain.onBoot`
4. runs `npx rhachet repo introspect`
5. **NEW BEHAVIOR:** command fails with actionable error
6. role author sees: `mechanic` + `no-hook-declared` + `add hooks.onBrain.onBoot with...`
7. role author fixes the issue
8. reruns `repo introspect`
9. success
10. role is published with correct boot hook

**the footgun is prevented.** the broken role never reaches npm.

## critical question: what about roles without bootable content?

the wish says:
> "if they want to make their role not bootable, then it shouldn't be in the registry to begin with"

**implementation behavior:**

roles without `briefs.dirs` AND without `skills.dirs`:
- no boot hook required
- pass the guard
- can be in registry

this is correct. roles that don't boot don't need boot hooks.

## critical question: could the error message be clearer?

current error:
```
   └─ mechanic
      ├─ has: briefs.dirs, skills.dirs
      ├─ reason: no-hook-declared
      └─ hint: add hooks.onBrain.onBoot with 'npx rhachet roles boot --role mechanic'
```

**question:** does the user know WHERE to add this?

**analysis:** the hint says "add hooks.onBrain.onBoot" — this tells the user:
- WHAT: `hooks.onBrain.onBoot`
- WITH: `'npx rhachet roles boot --role mechanic'`

but doesn't explicitly say:
- WHERE: in `package.json` under `rhachet.roles.mechanic`

**verdict:** the path is implicit. users who created the role know where role config lives. the hint is sufficient because it names the exact config key (`hooks.onBrain.onBoot`), and they can search their package.json for it.

this is not a blocker. the config structure is documented elsewhere.

## critical question: what about the `🔐` emoji?

treestruct standard says `🐚` for shell commands. implementation uses `🔐`.

**actual impact:** zero. the error is actionable regardless of emoji.

**verdict:** nitpick, not drift.

## conclusion

holds. the implementation delivers the requested footgun prevention with clear, actionable errors. the only questions raised are:
1. implicit WHERE in hint — acceptable because users know their config structure
2. wrong emoji — cosmetic, does not affect actionability

no ergonomics drift. the implementation matches the wish.

