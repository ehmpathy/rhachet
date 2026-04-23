# self-review: has-questioned-requirements

## requirement 1: github action for translation

**who said this was needed?**
handoff from rhachet-roles-bhuild (vlad/fix-radio branch). CI run evidence: https://github.com/ehmpathy/rhachet-roles-bhuild/actions/runs/24454964815

**what evidence supports this?**
test failure that shows `token prefix: {"appId":"3234162","` — raw JSON blob passed through instead of ghs_* token.

**what if we didn't do this?**
tests that rely on mechanism translation would fail in CI. users would need to manually generate tokens before CI runs.

**could we achieve the goal in a simpler way?**
**yes, considered alternative**: modify os.envvar vault adapter to detect JSON blobs with `mech` field and translate on read.

**why the action approach is better**:
1. **translation happens once** — action translates at workflow start, exports to env. all subsequent keyrack.get() calls read the pre-translated token.
2. **os.envvar approach would re-translate per call** — if code calls keyrack.get() 10 times for same key, that's 10 GitHub API calls to generate tokens. rate limit danger. slow.
3. **explicit over implicit** — action makes translation visible in workflow yaml. os.envvar auto-translation is magical.

**verdict**: requirement holds. action approach is justified.

---

## requirement 2: self-descriptive blobs with `mech` field

**who said this was needed?**
spec in `.behavior/v2026_02_08.keyrack-unlock/.refs/.todo.self-descriptive-mech-blobs.md`

**what evidence supports this?**
CI has no host manifest. without `mech` field in blob, action cannot know which adapter to use.

**could we achieve the goal in a simpler way?**
auto-detect mechanism from secret format (e.g., if JSON has appId+privateKey, assume EPHEMERAL_VIA_GITHUB_APP).

**why explicit is better**:
1. **auto-detection is fragile** — what if a future mechanism also uses appId field?
2. **explicit is safer** — `mech` field is clear intent declaration
3. **matches local behavior** — dev machines use explicit mech in host manifest

**verdict**: requirement holds.

---

## requirement 3: firewall blocks dangerous tokens (ghp_*, AKIA*)

**who said this was needed?**
this is extant behavior. acceptance tests in `blackbox/cli/keyrack.firewall.acceptance.test.ts`.

**what evidence supports this?**
security rationale: long-lived tokens can be leaked, rotated credentials are safer.

**what if we didn't do this?**
users could store ghp_* tokens directly in CI secrets. these never expire, can be stolen.

**verdict**: requirement holds. this is core keyrack value proposition.

---

## requirement 4: fail-fast behavior

**who said this was needed?**
proposed in vision, listed in open questions.

**should we reconsider?**
fail-fast is standard. but for CI debug, to see all failures at once might be more helpful.

**verdict**: keep as open question for wisher to validate. both approaches are defensible.

---

## requirement 5: backwards compatibility for secrets without `mech` field

**who said this was needed?**
proposed in vision edge cases.

**what if we didn't do this?**
all extant CI secrets would need migration before action works. high friction.

**is this scope right?**
yes. assume PERMANENT_VIA_REPLICA + firewall validation is safe default.

**verdict**: requirement holds.

---

## scope check

**is the scope too large?**
no. we build one github action that reuses extant mechanism adapters.

**is the scope too small?**
no. to solve the CI translation gap is the core problem.

**is the scope misdirected?**
no. the handoff clearly identifies the problem: JSON blobs not translated in CI.

---

## summary

| requirement | verdict |
|-------------|---------|
| github action for translation | holds (vs os.envvar approach) |
| self-descriptive `mech` field | holds |
| firewall blocks dangerous tokens | holds |
| fail-fast behavior | open question for wisher |
| backwards compatibility | holds |

all core requirements are justified. one open question remains for wisher input.
