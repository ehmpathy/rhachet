# domain.term.choice.reason: hook

## .etymology

**`hook` comes from the seam, not from the command.** a hook in software is a point where a
system deliberately yields control to code it did not write — a git hook, a webhook, an
`LD_PRELOAD` hook. the noun names the *attachment point*, and the third party's command is
merely what hangs there.

that is exactly the grain this domain needs. our code never authors a dependency's install
command; it only decides **whether the seam is honored on this invocation**. so the word that
belongs in our contract is the word for the seam.

the alternative the ecosystem hands us — `script` — names the hanging thing rather than the
seam, and is forbidden repo-wide (`rule.forbid.term-script`) for exactly the reason it fails
here: it conflates a command, a procedure, and a mechanism into one overloaded noun.

## .why the term surfaced NOW, and why it is domain rather than incidental

the term was not chosen from taste. it was **forced by a defect**, and the shape of the defect
is what makes `hook` a domain word rather than a naming preference.

`execNpmInstallLocal` passed `--ignore-scripts` unconditionally, with this comment beside it:

```ts
// .note = --ignore-scripts avoids pnpm v10 ERR_PNPM_IGNORED_BUILDS
//         rhachet-roles packages don't need lifecycle scripts to function
```

the justification is **true for role packages and false for rhachet itself** — rhachet carries
node-pty, whose install hook was, at `1.1.0`, the only producer of a linux binary. so one
hard-coded flag applied a correct policy for one dependency class and a fatal one for another,
and no call site had ever stated a position on either.

**the cure was not to change the flag's value.** it was to make the value impossible to acquire
without a decision (`rule.require.solve-at-cause`). that demanded a name for the thing being
decided about — and the decision is not *"do we pass a flag"* but *"do we honor the seam."*

hence: `NpmInstallLifecycleHooks = 'run' | 'skip'`, a required input, threaded to every caller.

## .disputes

### dispute: script  —  raised 2026-08-31  —  status: RESOLVED (keep `hook`)
- raised.by  = the ecosystem itself (npm, pnpm, and node-pty's own manifest all use it)
- claim      = the artifact is literally so named in `package.json`, the flag is literally
               `--ignore-scripts`, and pnpm's notice literally reads *"Ignored build scripts"*.
               to say anything else forces a translation on every reader who came from the docs
- counter    = three grounds. **(1)** the word is forbidden repo-wide
               (`rule.forbid.term-script`) as overloaded — command, procedure, operation, and
               mechanism all collapse into it. **(2)** it names the wrong grain: the artifact
               belongs to the third party, while the decision our contract holds is about the
               moment. **(3)** the translation cost is one-directional and small — a reader who
               knows npm reads `hook` and understands at once, while a reader who knows only our
               contract would read the ecosystem word and learn an overload
- resolution = keep `hook`. record the ecosystem word as a forbidden synonym.
               ⚠️ **with one carve-out, stated so it is not mistaken for drift:** it is retained
               VERBATIM inside quoted evidence and literal flag names — `--ignore-scripts` is a
               real cli flag, and `npm view … scripts` is a real command. to paraphrase a
               citation is to falsify it. the ban governs OUR prose and OUR contracts, never a
               quotation of someone else's

### dispute: postinstall  —  raised 2026-08-31  —  status: RESOLVED (keep `hook`)
- raised.by  = a reader who wanted the concrete over the abstract
- claim      = `postinstall` is the specific moment everyone means, and a concrete word beats a
               category
- counter    = it is one of at least three (`preinstall`, `install`, `postinstall`), and node-pty
               declares **two** of them. a policy that governs all of them cannot be named after
               one — that is the part-for-whole overload `term=tuple` rejects `arch` for
- resolution = keep `hook` for the class. `postinstall` remains legal as the name of one specific
               moment, when that is genuinely the subject

## .evidence

**the discovery move: five whys**, per `howto.domain-discovery`. the surface was a flag; the
motive was five layers down:

| why | answer |
|-----|--------|
| why does the install pass `--ignore-scripts`? | to avoid `ERR_PNPM_IGNORED_BUILDS` |
| why does that error fire? | pnpm ≥10 gates a dependency's build command behind an allowlist |
| why is there a gate? | a dependency's install command is arbitrary third-party code |
| why do we opt out rather than allowlist? | our role packages are pure content — the command changes no file that matters |
| why does the same flag apply to rhachet? | ⚠️ **it should not.** no one decided; the flag was inherited |

the fifth why is the defect, and it names the domain object: **a per-caller decision about a
third party's seam.** that object had no word, so it had no home, so it had no owner.

**the invariant this term guarantees**, now clamped in `execNpmInstall.test.ts`:

> for every `(target, lifecycleHooks)` pair, `--ignore-scripts` is present **if and only if**
> `lifecycleHooks === 'skip'`.

the clamp derives its rows from the two unions rather than lists them, so a future member of
either is covered by construction — the same one-list discipline `term=kind` records.

**the boundary evidence** for `'skip'` over `'omit'`: `term=omitted`'s own table declares
`skipped` = *"did not NEED to be done"* (a success) and `omitted` = *"could NOT be done"* (a
reported fault). the local install case is measured to be the first — `[case7]` shows node-pty's
hook exits 0 as a no-op once the prebuild ships. so `'skip'` is the conformant member, and
`'omit'` would have claimed a fault that does not exist.
