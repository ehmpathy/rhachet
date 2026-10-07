# rule.require.when-names-the-caller

> **a command invoked from a brain hook declares its CALLER with `--when hook.$event`. it never
> declares a POLICY with a bespoke flag of its own.**

```sh
rhx route.drive   --when hook.onStop      # ✅ the convention
rhx $cmd          --when hook.onStop      # ✅ conform to it
rhx $cmd          --only-when-over        # 🔴 a braided trail
```

the flag's value is `hook.` plus a declared `BrainHookEvent` — `hook.onBoot` · `hook.onTool` ·
`hook.onStop` · `hook.onTalk`. the **command** then decides what that caller deserves.

## .why — a policy flag moves the decision to the party least able to make it

both flags quiet the same roster. what parts them is **who owns the call, and forever**:

| | `--only-when-over` — a policy | `--when hook.onStop` — a caller |
|---|---|---|
| what the flag names | *"be quiet unless over"* | *"a stop hook invoked me"* |
| who decides the verbosity | 🔴 **the caller**, at every call site | **the command**, in one place |
| to change the rule later | 🔴 edit every hook that passes it, in every repo | edit the command |
| what a reader learns from the hook | a behavior, divorced from its reason | **who asks**, which is the fact |
| is it a new contract surface | 🔴 yes, and one per policy you invent | no — an extant convention, honored |

⇒ **a caller cannot know what it deserves.** a stop hook knows it is a stop hook; whether that
warrants a roster, a one-line warn, or silence is a judgment about the *command's* output, and it
changes as that output changes. to encode the answer in the call site freezes today's judgment into
every config that ever passed the flag.

🟡 **and the policy flag multiplies.** `--only-when-over` answers one question. the next caller wants
`--only-when-changed`, the next `--quiet-unless-urgent` — each a surface, each an authorization, each
a claim to keep true. `--when` answers all of them at once, because it names the **input** to the
judgment rather than the judgment.

## .the second why — it is already paved, and adjacency is not discovery

**measured 2026-09-22, this repo's own `.claude/settings.json`:**

```json
{ "command": "…/rhx route.drive --when hook.onStop", "author": "repo=bhrain/role=driver" },
{ "command": "…/rhachet roles budget",               "author": "rhachet" }
```

🔴 **two lines, same `Stop` array.** the convention sat directly above the hook that failed to use
it, and a bespoke flag was built anyway.

🟡 the second line names no role in its `author`, so it is also a framework-owned hook
(`rule.forbid.framework-owned-hooks`). the braid is the part that generalizes.

⇒ `rule.always.reuse-pavement-before-improvise` names it — **the braided trail**: *"a second path
laid beside a serviceable one, because the author did not look."* the lesson this adds is that
proximity does **not** substitute for the look. the pavement was one line away and still unread,
because a flag that is not in your own file is a flag you never grep for.

## .the test

> **does the flag name WHO asks, or WHAT they want?**

who → `--when hook.$event`, and the command decides · what → 🔴 stop. that is a policy, and it
belongs inside the command.

| when… | then… |
|---|---|
| you declare a hook command in `HOOKS_DECLARED` or a role's hooks | 🔴 pass `--when hook.$event`. it is not optional decoration |
| a hook's output is too loud, or too quiet | vary it **inside** the command, on the caller it was handed |
| you reach for `--quiet`, `--only-when-X`, `--if-Y` to tame a hook | 🔴 the strongest cue. that is a policy. the caller is the flag |
| the command has no `--when` yet | add it, with the declared value set — never invent a second convention beside it |
| a `--when` value is not a declared `hook.$event` | **refuse, loud.** a typo'd caller that silently falls back is a gate that quietly reverts to its old voice |
| you invoke the command **by hand** | pass no `--when`. an absent caller means a human asked, and a human gets the full output |
| a non-hook automated caller appears — ci, a cron | it is a caller, so it earns a `--when` value. it does not earn a policy flag |
| the hook calls a rhachet CLI **command** rather than a skill | 🔴 write `./node_modules/.bin/rhachet roles cost …`. never `rhx roles cost …` — `rhx X` is `rhachet run --skill X`, so it looks up a skill named `roles` and fails. never `npx rhachet` — `assertRegistryHooksNoNpx` refuses npx in a role hook |

## 🟡 .the bound — this governs a HOOK-invoked command

a flag that names a genuine **mode** of the work is not a policy flag in this sense — `--mode plan`
names what to do, and every caller has a real reason to choose. the target is narrower: **a flag
whose only job is to tune output for one repeat automated caller.** that caller has a name already,
and the name is the flag.

blocker: a hook command declared with no `--when hook.$event` · a bespoke policy flag added to tune a
hook's verbosity · a `--when` value outside the declared event set, accepted silently · a second
caller-context convention invented beside this one.
false positive: a hand invocation with no `--when` · a genuine mode flag every caller chooses among.

⇒ see also: `rule.always.reuse-pavement-before-improvise` (learner — the braided trail this instances)
· `.agent/repo=bhrain/role=driver/skills/route.drive.sh` (the convention's origin, and its two
documented values) · `src/domain.objects/BrainHookEvent.ts` (the declared event set the value set
derives from) · `rule.require.failfast` (why an unknown value refuses).
