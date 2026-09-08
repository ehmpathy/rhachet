# domain.term: target

term.chosen   = target
term.kind     = noun
term.synonyms.forbidden:
- job
- unit
- item
- entry
- slot
- variant
- combo
- scope       # sense B only — see the resolved dispute in .reason

## .what

⚠️ **`target` carries TWO senses in this repo, and both are declared.** the ambiguity is real,
recorded rather than resolved, and it is why this section leads with a table.

| sense | what it means | declared as |
|-------|---------------|-------------|
| **A — the fill target** | one credential `fill` must make present: a single (key × reach) pair | `KeyrackFillTarget`, `getAllKeyrackFillTargets`, `getOneKeyrackFillTargetCount` |
| **B — the install target** | where an install lands: the project tree, or the global store | `NpmInstallTarget`, `execNpmInstall({ target })`, `ConsumerInstallTarget` |

one english word sits beneath both: **what an operation aims at.** sense A aims a `fill` loop at
one credential; sense B aims an install at one tree. the word is honest in each; what it does not
do is disambiguate itself.

### sense A — the fill target

before the reach axis, `fill` walked one loop: key × owner. a key was one credential to
provision, so it needed no word of its own. reach split that: one key now yields **N** credentials
to provision — the reachless one, plus one per declared reach. the inner loop gained a subject,
and `target` is its name.

```
key     : what a manifest declares         — `EHMPATH_BEAVER_GITHUB_TOKEN`
target  : one reach OF that key        — the reachless one, or `github://org=ehmpathy`
```

a target carries the reach it names and the **directive** that governs it (`require` / `prefer`),
or `null` for the reachless one — which is why the reachless target always **leads** the list: a
key is cut reachless whether or not any reach is declared.

### sense B — the install target

a closed union, `'local' | 'global'`, that names **where** a package-manager install lands:

```
local   : the project tree — `pnpm install` in a cwd
global  : the global store — `pnpm add -g`
```

it earned a word because the two are **not** variants of one another. measured, a blocked build
hook reports differently on each: at pnpm 11 a local install raises `ERR_PNPM_IGNORED_BUILDS` and
exits 1, while a global install prints no gate line at all and exits 0. so any claim about an
install's report is keyed by `(target, packageManagerMajor)` — and a claim proven on one target
and quoted for the other is a defect, not a shortcut.

## .the rule this cluster asks of you

> **never use `target` bare in a contract.** always compound it so the sense is local:
> `KeyrackFillTarget` for A · `NpmInstallTarget` / `ConsumerInstallTarget` for B.

a bare `target` in a new contract is a drift to be renamed or disputed, never merged. the
exception that proves it: `execNpmInstall({ target: NpmInstallTarget })` uses the bare word as a
**field**, where the type at the call site supplies the sense — the same allowance `hostTuple`
gets from its compound.

## .the hazard, stated so the next traveler does not have to find it

⚠️ **the drift is not toward the other sense — it is toward a SYNONYM.** the two senses live in
different directories (`keyrack/fill/` and `upgrade/`), so a reader rarely meets them together and
rarely confuses them. what actually happened is the reverse: an author deep in sense B, with no
sight of `NpmInstallTarget`, reached for `scope` for the identical union.

the lived case: `ConsumerInstallTarget` in `getPtyModuleOrNull.consumer.integration.test.ts` was
first authored as `ConsumerScope`, a synonym of a term declared two directories away — in the very
file written to prove that a claim must not outrun its subject. it was caught by a grep of the
union's **values** (`'local' | 'global'`), never by a grep of either name.

`scope` was rejected on its own merits too: it already names npm's `@org/pkg` package scope,
`rhx git.repo.test --scope`, and `rhx review --scope`, so it would trade a two-sense overload for
a four-sense one.

## .refs
- `src/domain.operations/keyrack/fill/getAllKeyrackFillTargets.ts`      # sense A, the dobj + its derivation
- `src/domain.operations/keyrack/fill/getOneKeyrackFillTargetCount.ts`  # sense A, the progress denominator
- `src/domain.operations/keyrack/cli/asKeyrackFillTargetBranch.ts`      # sense A, the per-target render
- `src/domain.operations/keyrack/fill/fillKeyrackKeys.ts`               # sense A, the loop it names
- `src/domain.operations/upgrade/execNpmInstall.ts`                     # sense B, the owner
- `src/domain.operations/upgrade/execNpmInstallGlobal.ts`               # sense B, `target: 'global'`
- `src/domain.operations/upgrade/execNpmInstallLocal.ts`                # sense B, `target: 'local'`
- `src/domain.operations/clone/pty/getPtyModuleOrNull.consumer.integration.test.ts` # sense B, the clamp's axis

## .why a word was needed at all — sense A
the count and the loop had **no shared noun**, so each described the same set in its own
arithmetic (`1 + reaches.length` beside a `[{...}, ...reaches.map(...)]` literal). two
expressions of one truth, with no compiler link — and the drift renders as a wrong `(n/total)`
that never throws. once the set had a name, the count could **read from the derivation** instead
of re-derive it, and the drift became impossible rather than merely unlikely.

a term earned by a defect it closes, not by a taxonomy it fits.

## .why a word was needed at all — sense B

the install path had the union in three places (`execNpmInstall`, and the two wrappers that call
it) with no shared noun, so a fourth author reached for `scope`. worse, the report keyed on it is
**not** uniform: a claim measured under `local` and quoted for `global` is wrong in both cells at
pnpm 11. the word is what makes the axis visible enough that a row must declare which cell it
measured.

same shape as sense A: a term earned by a defect it closes.

## .reason
see the ref-level cluster beside this choice:
- `term=target._.choice.reason.md` — etymology, rejected synonyms, evidence
