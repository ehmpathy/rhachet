# handoff: graceful skill failure output

## .what

when a skill exits non-zero with a user-friendly message, rhachet currently wraps it in an ugly error block:

```
⛈️  skill execution failed

{
  "skill": "git.commit.set",
  "path": "...",
  "exitCode": 1
}

🪨 run solid skill repo=ehmpathy/role=mechanic/skill=git.commit.set

🐢 bummer dude...

🐚 git.commit.set
   └─ error: no commit quota set

ask your human to grant:
  $ git.commit.uses set --quant N --push allow|block
```

## .want

skill output should display cleanly without the rhachet error wrapper:

```
🐢 bummer dude...

🐚 git.commit.set
   └─ error: no commit quota set

ask your human to grant:
  $ git.commit.uses set --quant N --push allow|block
```

the exit code should still be 1 (fail), but rhachet should not prepend the error JSON block.

## .why

- the skill already provides a clear, user-friendly error message
- the JSON block adds noise and hides the actual message
- agents and humans both benefit from clean output

## .decision

use exit 2 for graceful failure ("block with message"):

- exit 0 = success
- exit 1 = unexpected error
- exit 2 = graceful failure (bad request)

## .exit 2 behavior (graceful failure)

when skill exits 2, rhachet should:

1. emit skill identifier with status subtree
2. emit skill stderr (the user-friendly message)
3. propagate exit code 2

example:
```
🪨 run solid skill repo=ehmpathy/role=mechanic/skill=git.commit.set
   └─ ✋ blocked by constraints

🐢 bummer dude...

🐚 git.commit.set
   └─ error: no commit quota set

ask your human to grant:
  $ git.commit.uses set --quant N --push allow|block
```

## .exit 1 behavior (unexpected error)

when skill exits non-zero (not 2), rhachet should:

1. emit skill identifier with status subtree
2. emit skill stderr
3. propagate original exit code

example:
```
🪨 run solid skill repo=ehmpathy/role=mechanic/skill=git.commit.set
   └─ 💥 failed with an error

bash: line 42: jq: command not found
```

no JSON block in either case.

## .context

this came up when we tested the stdin pattern:
```bash
echo 'fix(test): verify stdin

- proof stdin works' | npx rhachet run --skill git.commit.set -m @stdin --mode plan
```

the skill correctly detected "no commit quota" and printed a helpful message, but rhachet wrapped it in error JSON.
