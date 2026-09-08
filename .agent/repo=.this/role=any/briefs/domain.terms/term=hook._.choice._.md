# domain.term: hook

term.chosen   = hook
term.kind     = noun
term.synonyms.forbidden:
- script
- lifecycle-script
- postinstall
- callback
- trigger

## .what

**a command a THIRD PARTY declares, which OUR tool invokes on their behalf at a named moment
in a lifecycle.** the moment is ours; the command is theirs.

a hook is defined by two properties together:

1. **we do not author it** — a dependency's `package.json` declares it, or a route's guard does
2. **we decide whether it runs** — its execution is a policy our code holds, never the author's

that second property is why the word earns a place in a contract rather than a comment: something
must NAME the decision, and `NpmInstallLifecycleHooks` is that name.

declared uses:

```
NpmInstallLifecycleHooks   run | skip     — whether an install invokes its deps' declared hooks
```

⚠️ hand-copied from `execNpmInstall.ts`, which is the writer. read it there before you lean on
the line here.

## .why it earns a word

**because `script` is forbidden** (`rule.forbid.term-script`), and the npm ecosystem's own word
for these is exactly that — `package.json#scripts`, `--ignore-scripts`, `pnpm approve-builds`'s
"Ignored build scripts". so a repo that bans that word needs a canonical replacement, or every
reader invents their own.

`hook` is the right replacement rather than a mere substitute: it names the **moment** (the
lifecycle point where our code yields control) rather than the **artifact** (a shell string). the
artifact is the third party's concern; the moment is ours, and the moment is what we decide about.

## .the property it guarantees

**a hook's execution is always a DECLARED decision, never a default.** `NpmInstallLifecycleHooks`
is a required input with no default and no optional marker (`rule.forbid.undefined-inputs`), so no
call site can acquire a hook policy without a stated position:

| call site | value | the position it states |
|-----------|-------|------------------------|
| `execNpmInstallLocal` (via `execUpgrade`) | `'skip'` | our deps' hooks are pure content or measured no-ops |
| `execNpmInstallGlobal` | `'run'` | the global store is the human's own; their gate is the authority |

⚠️ **this is the exact shape of the defect that produced this term.** `--ignore-scripts` was once
hard-coded on the install path, so *every* caller inherited an opt-out nobody had chosen — and the
comment beside it justified the choice for role packages while rhachet's own native addon rode the
same flag. a hook policy that is inherited rather than stated is a policy no one owns.

> **the moment is ours to decide, so the decision must be spoken at the site that owns it.**

## ⚠️ .the boundary — `hook` vs `step`

> **did a THIRD PARTY declare the command we are about to run?**

- yes → `hook` (a dep's install hook; a route guard's judge command)
- no, we wrote it → a step, a stage, a named operation

a step is ours end to end. a hook is a seam we opened for someone else.

## .the `skip` member conforms to the extant sibling

`'skip'` is deliberate rather than incidental. per `term=omitted`'s boundary table, `skipped`
means *"did not NEED to be done"* and is a success, while `omitted` means *"could NOT be done"*
and is a reported fault. our local install case is the first: role packages are pure content and
node-pty's hook is a measured no-op (`[case7]`), so the work was not needed. **`'omit'` would
have claimed a fault where there is none.**

## .refs
- `src/domain.operations/upgrade/execNpmInstall.ts`        # `NpmInstallLifecycleHooks`, the arg builder
- `src/domain.operations/upgrade/execNpmInstallLocal.ts`   # passes it through, never chooses
- `src/domain.operations/upgrade/execNpmInstallGlobal.ts`  # states `'run'`
- `src/domain.operations/upgrade/execUpgrade.ts`           # states `'skip'`, with a per-class rationale
- `src/domain.operations/upgrade/execNpmInstall.test.ts`   # the clamp: every target × every hook value

## .not a synonym of

- 👎 `script` — forbidden repo-wide (`rule.forbid.term-script`), and it names the artifact rather
  than the moment. the artifact belongs to the third party; the moment is what our code decides
- 👎 `lifecycle-script` / `postinstall` — npm's own vocabulary, and both are narrower: `postinstall`
  is ONE hook of several (`preinstall`, `install`, `postinstall`), so to use it for the class would
  be a part-for-whole overload
- 👎 `callback` — a callback is invoked WITHIN our process with our data; a hook is a subprocess we
  hand control to. the trust boundary is opposite
- 👎 `trigger` — a trigger fires on a CONDITION; a hook fires at a MOMENT. the distinction matters
  because a hook's non-execution is a policy we set, while a trigger's is a fact about the world

## .reason
see the ref-level cluster beside this choice:
- `term=hook._.choice.reason.md` — etymology, the rejected synonyms, evidence
