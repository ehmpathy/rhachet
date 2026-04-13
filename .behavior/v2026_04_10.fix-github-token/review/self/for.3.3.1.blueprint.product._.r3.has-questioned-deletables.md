# self-review r3: has-questioned-deletables

## purpose

try hard to delete before optimize. question every feature and component in the blueprint.

---

## feature traceability

### feature 1: KeyrackKeySpec.mech nullable

**traces to:**
- vision: "fill asks how i want to store each credential"
- criteria: matrix.1 shows "manifest mech null" dimension

**delete it?** no — required for vault adapter to prompt. without nullable mech, hydration must provide a value.

**simplify it?** already minimal — one type change: `KeyrackGrantMechanism` → `KeyrackGrantMechanism | null`

---

### feature 2: hydrateKeyrackRepoManifest removes hardcoded mech

**traces to:**
- vision: "same flow as set"
- vision: root cause — "fill was forced into PERMANENT_VIA_REPLICA"
- criteria: matrix.3 shows fill/set parity requirement

**delete it?** no — this IS the fix. deleting it means keeping the defect.

**simplify it?** already minimal — change `mech: 'PERMANENT_VIA_REPLICA'` to `mech: null` at 3 locations. each location is a distinct branch (env.all, expanded, env-specific). cannot reduce to fewer locations.

---

### feature 3: mechAdapterGithubApp tilde expansion

**traces to:**
- handoff: mentions tilde path ENOENT issue
- criteria: matrix.2 shows "pem path format: tilde (~/.ssh/...)" dimension

**hard question: is this in scope?**

the vision's core ask is "fill prompts for mech like set does". tilde expansion is a bug in mechAdapterGithubApp that affects anyone who uses GitHub App with tilde paths — not just fill. strictly stated, this is a secondary fix discovered in research phase.

**why it's included:**
1. discovered while we tested the mech prompt flow for GitHub App
2. without this fix, GitHub App flow fails for users who specify `~/.ssh/my.pem`
3. it's one line — to separate into its own behavior route costs more than the fix
4. codified in criteria matrix.2 in criteria phase

**could we separate it?**
yes. this could be its own behavior route: "fix tilde expansion in mechAdapterGithubApp". it affects set and fill equally.

**why we don't:**
- the fix is minimal (one import, one line)
- it enables complete test coverage of the mech prompt flow
- to separate it adds overhead without benefit
- it's already documented in criteria matrix

**delete it?** no — but acknowledge it's a secondary fix bundled with the primary fix.

**simplify it?** already minimal — `pemPath.trim().replace(/^~(?=$|\/|\\)/, homedir())`

**alternative: require absolute paths?**
technically possible, but degrades UX. users expect `~/` to work because shell expands it. Node.js doesn't — that's the bug. to require absolute paths punishes users for Node's limitation.

---

## component deletion check

### component: KeyrackKeySpec domain object

**question:** can we delete this and inline mech handling?

**answer:** no — KeyrackKeySpec exists independently of this fix. we're modifying one attribute, not adding a new component.

---

### component: inferKeyrackMechForSet

**question:** can we delete this and inline the prompt?

**answer:** no — this already exists and works. we're reusing it by passing null to vault.set. deleting it would mean duplicating prompt logic in fill.

---

### component: tilde expansion regex

**question:** can we use a simpler approach?

**answer:** the regex `/^~(?=$|\/|\\)/` handles:
- `~` alone (end of string)
- `~/` prefix
- `~\` prefix (windows)

simpler approach: `pemPath.replace(/^~/, homedir())` — but this wrongly expands `~user` to `/home/currentuser` instead of leaving it alone.

the lookahead `(?=$|\/|\\)` ensures we only expand `~` when followed by end of string, `/`, or `\`. this is the correct behavior per POSIX.

**delete it?** no — needed for correctness.

---

## did we add features not asked for?

checked blueprint for features beyond vision scope:

| blueprint item | traced to vision/criteria? |
|----------------|---------------------------|
| mech nullable | yes — enables prompt |
| hydration removes hardcode | yes — root cause fix |
| tilde expansion | yes — from handoff |
| test coverage (implicit) | yes — confirms extant tests pass |

no features added beyond scope.

---

## did we optimize a component that shouldn't exist?

**question:** is there a simpler solution that doesn't require these 3 changes?

**consideration 1:** could we change fillKeyrackKeys to prompt directly instead of modifying hydration?

**answer:** no — this would duplicate vault.set's logic. the vision says "same flow as set" — sharing code is correct.

**consideration 2:** could we add a config option to disable hardcoded mech?

**answer:** no — adding config complexity when the simple fix is "don't hardcode". the vision doesn't ask for config.

**consideration 3:** could we skip the tilde expansion and document "use absolute paths"?

**answer:** technically yes, but this degrades UX. users expect `~/` to work. Node.js quirk shouldn't leak to users.

---

## what is the simplest version that works?

the blueprint is already minimal:

1. **one type change** — make mech nullable
2. **one value change** — null instead of hardcoded string (3 locations, each semantically distinct)
3. **one import + one line** — homedir() for tilde expansion

total diff: ~15 lines changed. no new files. no new abstractions. no new tests required.

this is the simplest version.

---

## conclusion

**no deletables found.**

all features trace to vision/criteria/handoff:
- mech nullable → enables prompt
- hydration removes hardcode → root cause fix
- tilde expansion → from handoff

all components are reused or minimal:
- KeyrackKeySpec → modified attribute only
- inferKeyrackMechForSet → reused, not new
- regex → minimal correct solution

the blueprint is already as simple as possible.
