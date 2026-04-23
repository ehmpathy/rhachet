# self-review r2: has-questioned-assumptions

## issue found: multiline JSON in secrets input

**the assumption**: `KEY=json` per-line input format will parse cleanly.

**the problem**: JSON blobs with embedded newlines (e.g., RSA private keys) span multiple lines when interpolated via `${{ secrets.X }}`. line-by-line parse would break.

**the fix applied**: changed from `secrets` input to `env` context.

before:
```yaml
- uses: rhachet/keyrack@v1
  with:
    secrets: |
      KEY=${{ secrets.KEY }}
```

after:
```yaml
- uses: rhachet/keyrack@v1
  env:
    KEY: ${{ secrets.KEY }}
```

**why this works**: GitHub Actions handles multiline values in env correctly. the action reads from its own environment context. this is also more idiomatic for GitHub Actions users.

**files updated**:
- `1.vision.yield.md` section "2. secrets input format and multiline JSON" — added issue discovery and solution
- `1.vision.yield.md` user experience examples — updated to use `env` instead of `with: secrets`
- `1.vision.yield.md` open questions — marked multi-secret format as resolved
- `1.vision.yield.md` what needs to be built — changed "action secret parser" to "action env reader"

**lesson for next time**: when the input format involves user-controlled strings (like JSON blobs), always consider edge cases: newlines, special characters, encoded formats.

---

## additional assumptions reviewed in r2

### assumption: action can distinguish keyrack env vars from system env vars

**the assumption**: when action reads `process.env`, it knows which vars to translate.

**what if the opposite were true?**: if action tries to translate `PATH` or `HOME`, it would fail or cause chaos.

**solution**: action only processes env vars that:
1. are passed explicitly via the action's `env:` block (GitHub provides a way to detect this), OR
2. match a pattern convention (e.g., `*_TOKEN`, `*_CREDS`), OR
3. contain valid JSON with `mech` field (try-parse approach)

**verdict**: needs clarification in blueprint. try-parse approach is safest.

---

### assumption: mechAdapterGithubApp is stateless/pure

**the assumption**: mechanism adapters are pure functions.

**what if the opposite were true?**: mechAdapterGithubApp.deliverForGet() makes network calls to GitHub API. it's async and can fail (rate limit, network, auth).

**correction**: adapters are NOT pure. they are async communicators. the vision said "same mechanism adapters" — this is correct, but the description of them as "pure" was inaccurate.

**impact on vision**: none. the reuse strategy is still valid. just need accurate mental model.

---

### assumption: $GITHUB_ENV export is sufficient

**the assumption**: action writes to $GITHUB_ENV, subsequent steps see the values.

**what if user wants secrets in same step?**: $GITHUB_ENV only affects subsequent steps, not the current step.

**is this a problem?**: no. the action step itself doesn't need the translated secrets. it just translates and exports.

**verdict**: assumption holds for the usecase.

---

### assumption: action is JavaScript/TypeScript

**the assumption**: we'll build a node action.

**alternatives**:
- composite action (shell commands)
- docker action

**why node is better**:
- can reuse extant TypeScript mechanism adapters directly
- faster startup than docker
- composite actions can't easily do complex JSON parse

**verdict**: assumption holds. node action is correct choice.

---

## summary

| assumption | verdict | action |
|------------|---------|--------|
| multiline JSON in secrets input | did NOT hold | fixed: use `env` instead |
| distinguish keyrack vars from system vars | needs clarification | add to blueprint |
| mechanism adapters are pure | inaccurate | they're async communicators (no change needed) |
| $GITHUB_ENV export is sufficient | holds | no change |
| action is node/TypeScript | holds | no change |
