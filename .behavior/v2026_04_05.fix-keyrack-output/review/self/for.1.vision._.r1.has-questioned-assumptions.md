# self-review: has-questioned-assumptions

## assumption 1: `--value` should not print trailing newline

**what do we assume?** that piping wants no trailing newline.

**evidence?** common unix tool behavior (e.g., `echo -n`, `printf`). newlines break `$(...)` substitution when values already contain newlines.

**what if opposite?** some tools expect newlines. but `--json` already provides full structure if needed.

**did wisher say?** no — inferred from "for piping" mental model.

**verdict:** reasonable assumption but should document. most pipe usecases want raw value.

---

## assumption 2: `source` output uses single quotes

**what do we assume?** single-quoted export statements: `export X='secret'`

**evidence?** single quotes preserve literal content in bash/zsh. only `'` itself needs escaping.

**what if opposite?** double quotes would need `$`, `` ` ``, `\`, `"` escaping — more complex.

**counterexample:** secrets with literal `'` chars need special handling: `'sec'\''ret'`

**did wisher say?** no — pure implementation detail.

**verdict:** sound assumption. single quotes simpler for most secrets.

---

## assumption 3: `--strict` is the default

**what do we assume?** strict mode by default, lenient opt-in.

**evidence?** sdk does this: `mode ?? 'strict'`. fail-fast philosophy.

**what if opposite?** lenient default could cause silent failures in ci/cd — dangerous.

**did wisher say?** no, but said "matches the sdk" — sdk defaults to strict.

**verdict:** holds. fail-fast is safer. matches sdk.

---

## assumption 4: `source` without `--key` sources all repo keys

**what do we assume?** omitting `--key` means "all repo manifest keys for env".

**evidence?** sdk's `sourceAllKeysIntoEnv` has no key filter — it's all keys or none.

**what if opposite?** could require `--for repo` explicitly like `keyrack get`.

**did wisher say?** wish shows `--key xyz` example only, not the all-keys case.

**issue found:** i added all-keys behavior without wisher request. the wish only mentions single-key mode.

**verdict:** assumption exceeds wish scope. should either:
- remove all-keys mode from vision
- or flag as "bonus feature" needing wisher approval

---

## assumption 5: shell escaping is well-understood

**what do we assume?** we can handle shell escaping correctly.

**evidence?** established patterns exist. single-quote + escape-quote pattern covers 99.9% of cases.

**counterexample:** null bytes, control characters may cause issues in some shells.

**did wisher say?** no — implementation detail.

**verdict:** mostly holds. document limits. recommend `--json` for programmatic edge cases.

---

## assumption 6: `--env` is required for source

**what do we assume?** must specify env explicitly.

**evidence?** matches `keyrack get` pattern. env-specific credentials shouldn't be guessed.

**what if opposite?** could infer from context (e.g., NODE_ENV). but that's implicit magic.

**did wisher say?** not explicitly, but shown in example.

**verdict:** holds. explicit is better than implicit for credentials.

---

## assumption 7: `--owner` is required for source

**what do we assume?** must specify owner.

**evidence?** sdk requires owner. multi-owner setups need disambiguation.

**what if opposite?** could default to "default" owner. but that's implicit.

**did wisher say?** not explicitly.

**verdict:** holds for now. matches sdk. could reconsider defaulting to "default".

---

## issues found

1. **assumption 4 (all-keys mode)**: i added functionality beyond what the wish requested. the wish only shows `source --key xyz`, not `source --for repo` or `source` without `--key`.

## actions

1. update vision to clarify that all-keys mode is a "nice-to-have" extension, not a direct wish requirement.
2. make single-key mode the primary documented usecase since that's what the wish explicitly requested.

## overall assessment

most assumptions are sound and match sdk behavior. main issue: i expanded scope to include all-keys mode which wasn't explicitly requested. should flag this for wisher approval.
