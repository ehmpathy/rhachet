## what

add ./node_modules/.bin/rhx (prefix match) to the pre-approved bash permissions emitted by the
mechanic sessionstart.notify-permissions init and enforced by pretooluse.check-permissions.

## why

driver/route skills and hooks invoke the CLI as ./node_modules/.bin/rhx route.stone.set ... and
./node_modules/.bin/rhx route.drive ... (see a consumer repo's .claude/settings.json hooks). today
only the rhx:* and npx rhx:* prefixes are pre-approved; the direct ./node_modules/.bin/rhx form is
NOT, so every route command (contemplate / arrive / drive) trips the check-permissions gate and
halts autonomous flow with a per-command approval prompt.

## fix

in the permissions init source (the allowlist that check-permissions reads), add a prefix entry
equivalent to Bash(./node_modules/.bin/rhx:*) alongside the extant rhx:* and npx rhx:* prefixes.

## note

a consumer added Bash(./node_modules/.bin/rhx:*) to their local .claude/settings.json as a stopgap,
but that only governs Claude Code's native prompt, not the rhachet check-permissions hook's own
list — hence this task to fix it at the init source so every consumer inherits it.
