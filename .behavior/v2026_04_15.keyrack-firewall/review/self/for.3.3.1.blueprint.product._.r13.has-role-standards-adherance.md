# self-review: has-role-standards-adherance

review for adherance to mechanic role standards.

---

## search methodology

### briefs directories enumerated

I searched the mechanic briefs loaded in context and identified these rule categories:

| directory | brief files | relevance to blueprint |
|-----------|-------------|------------------------|
| practices/lang.terms/ | rule.forbid.gerunds.md, rule.require.ubiqlang.md, rule.require.treestruct.md | component names, output format |
| practices/lang.tones/ | rule.prefer.lowercase.md, rule.forbid.buzzwords.md | output labels, comments |
| practices/code.prod/evolvable.domain.operations/ | define.domain-operation-grains.md, rule.require.get-set-gen-verbs.md | operation design |
| practices/code.prod/evolvable.procedures/ | rule.require.input-context-pattern.md, rule.require.single-responsibility.md, rule.forbid.positional-args.md | function signatures |
| practices/code.prod/pitofsuccess.errors/ | rule.require.failfast.md, rule.require.exit-code-semantics.md | error handler |
| practices/code.prod/readable.narrative/ | rule.require.orchestrators-as-narrative.md, rule.forbid.inline-decode-friction.md | orchestrator flow |
| practices/code.test/frames.behavior/ | rule.require.given-when-then.md | test structure |
| practices/code.test/scope.coverage/ | rule.require.test-coverage-by-grain.md | test types |

### blueprint files examined

I went through the blueprint yield file line by line:
- lines 22-51: filediff tree
- lines 55-94: codepath tree
- lines 98-170: test coverage
- lines 185-221: architecture flow
- lines 223-251: mech detection and firewall validation
- lines 255-272: action manifest
- lines 276-302: output format
- lines 354-376: error cases and edge cases

---

## rule 1: define.domain-operation-grains

**rule**: operations have three grains — transformer (pure), communicator (i/o boundary), orchestrator (compose)

### parseSecretsInput.ts analysis

**blueprint location**: line 67

**codepath tree declaration**:
```
├── [+] parseSecretsInput.ts                        # transformer: parse input
│   ├── parse JSON from input.secrets
│   └── return Record<string, string>
```

**grain classification check**:
- takes string input → returns structured data
- no side effects, no external calls
- deterministic

**why it holds**: the operation transforms raw JSON string to typed record. this matches transformer definition: "pure computation, no side effects, decode-friction logic + format conversion."

### filterToManifestKeys.ts analysis

**blueprint location**: line 71

**codepath tree declaration**:
```
├── [+] filterToManifestKeys.ts                     # transformer: filter keys
│   ├── read manifest declared keys
│   └── filter secrets to intersection
```

**grain classification check**:
- takes two collections → returns subset
- no side effects, no external calls
- deterministic

**why it holds**: the operation computes intersection of two sets. this matches transformer definition: "returns subset of input collection."

### processOneSecret.ts analysis

**blueprint location**: line 75

**codepath tree declaration**:
```
├── [+] processOneSecret.ts                         # orchestrator: process key
│   ├── detect mech field in value
│   ├── route to mech adapter
│   │   ├── [←] mechAdapterGithubApp.deliverForGet
│   │   ├── [←] mechAdapterAwsSso.deliverForGet
│   │   └── [←] mechAdapterReplica.deliverForGet
│   ├── validate via firewall patterns
│   └── return KeyrackGrantAttempt
```

**grain classification check**:
- composes multiple adapter calls
- routes based on mech detection
- each line tells WHAT, not HOW

**why it holds**: the operation orchestrates: detect → route → validate → return. it composes calls to mechanism adapters. this matches orchestrator definition: "named operation calls only."

### exportGrantedSecrets.ts analysis

**blueprint location**: line 84

**codepath tree declaration**:
```
└── [+] exportGrantedSecrets.ts                     # communicator: export env
    ├── core.setSecret() for each granted
    └── core.exportVariable() for each granted
```

**grain classification check**:
- calls @actions/core SDK
- writes to external system ($GITHUB_ENV)
- side effects (mask + export)

**why it holds**: the operation calls SDK methods that write to external state. this matches communicator definition: "raw i/o boundary, SDK calls."

### index.ts analysis

**blueprint location**: line 59

**codepath tree declaration**:
```
├── [+] index.ts                                    # orchestrator: action entry
│   ├── read secrets input
│   ├── read keyrack.yml via daoKeyrackRepoManifest
│   ├── filter to declared keys
│   ├── process each key
│   ├── fail fast on any error
│   └── export granted secrets
```

**grain classification check**:
- composes parseSecretsInput, daoKeyrackRepoManifest.get, filterToManifestKeys, processOneSecret, exportGrantedSecrets
- each line is a named operation call
- no inline decode-friction

**why it holds**: the entry point orchestrates the full action flow. each step is a named operation. this matches orchestrator definition: "reads as narrative, each line tells WHAT happens."

---

## rule 2: rule.require.get-set-gen-verbs

**rule**: operations use get*, set*, gen* verbs; specific prefixes allowed for grains

### verb analysis per component

| component | verb | allowed? | evidence |
|-----------|------|----------|----------|
| parseSecretsInput | parse* | yes | brief: `parse*` for transformers that extract structured data |
| filterToManifestKeys | filter* | yes | r9 review: extant convention for subset operations |
| processOneSecret | process* | yes | r9 review: new prefix justified for "detect → route → validate" |
| exportGrantedSecrets | export* | yes | r9 review: fills gap as inverse of `source*` |

**why it holds**: each verb prefix follows documented conventions. `parse*` and `filter*` are established for transformers. `process*` and `export*` are new prefixes with justification in prior review (r9). no forbidden verbs used (create*, insert*, find*, fetch*, lookup*, ensure*).

---

## rule 3: rule.require.input-context-pattern

**rule**: procedures accept (input, context?) with named args

### signature analysis per component

**parseSecretsInput** (transformer):
- expected: `(input: { secrets: string }): Record<string, string>`
- context: not needed (pure)

**filterToManifestKeys** (transformer):
- expected: `(input: { secrets: Record<string, string>; manifest: KeyrackRepoManifest }): Record<string, string>`
- context: not needed (pure)

**processOneSecret** (orchestrator):
- expected: `(input: { key: string; value: string }, context: { mechAdapters: ... })`
- context: needed for adapter access

**exportGrantedSecrets** (communicator):
- expected: `(input: { grants: KeyrackGrantAttempt[] })`
- context: not needed (@actions/core imported directly — idiomatic for GitHub Actions)

**index.ts** (orchestrator):
- expected: entry point, no function signature (action main)

**why it holds**: each component follows (input, context?) pattern. transformers omit context (pure). orchestrators include context for dependencies. communicator uses direct import of @actions/core which is idiomatic for GitHub Actions (global in action runtime).

---

## rule 4: rule.require.failfast

**rule**: fail early on invalid state; use HelpfulError subclasses with exit codes

### error case analysis

**blueprint lines 356-362** (after fix):
```
| error | exit | output |
|-------|------|--------|
| malformed secrets JSON | 2 | parse error + hint |
| keyrack.yml not found | 2 | not found + hint |
| unknown mech | 1 | unknown mech + supported list |
| translation api error | 1 | api error + key name |
| blocked pattern detected | 2 | blocked + reason + fix |
```

**fail-fast behavior**:
- blueprint line 213: "fail fast on first blocked/error"
- edge case line 373: "one secret blocked → fail fast, none exported"
- test case line 153: "one key blocked → fail fast"

**why it holds**: all error cases have explicit exit codes. fail-fast on first error is declared in architecture flow and edge cases. partial success is forbidden — "none exported" when one blocked.

---

## rule 5: rule.require.exit-code-semantics

**rule**: exit 1 = malfunction (server fix), exit 2 = constraint (caller fix)

### exit code analysis (after fix)

| error | exit | who fixes | analysis |
|-------|------|-----------|----------|
| malformed secrets JSON | 2 | caller | correct — caller passed invalid input |
| keyrack.yml not found | 2 | caller | correct — caller misconfigured repo |
| unknown mech | 1 | server | correct — internal error |
| translation api error | 1 | server | correct — external failure |
| blocked pattern detected | 2 | caller | correct — caller used bad credential |

**why it holds**: all exit codes follow semantics correctly. constraint errors (exit 2) are for caller-fixable issues. malfunction errors (exit 1) are for server-side issues where retry might help.

---

## rule 6: rule.forbid.inline-decode-friction

**rule**: orchestrators must not contain decode-friction; extract to named transformers

### decode-friction analysis

**blueprint lines 226-236 — mech detection sample code**:
```typescript
const detectMech = (value: string): KeyrackGrantMechanism | null => {
  try {
    const parsed = JSON.parse(value);
    if (parsed.mech && typeof parsed.mech === 'string') {
      return parsed.mech as KeyrackGrantMechanism;
    }
    return null;
  } catch {
    return null;
  }
};
```

**analysis**: this is sample code shown in blueprint for illustration. the function `detectMech` is a named transformer (pure, no side effects). the orchestrator `processOneSecret` would call `detectMech(value)` — no inline decode-friction.

**why it holds**: the blueprint shows mech detection as a named function, not inline code in the orchestrator. the sample code demonstrates extraction to a transformer. implementation follows this pattern.

---

## rule 7: rule.require.given-when-then

**rule**: tests use given/when/then BDD structure with case labels

### test structure analysis

**blueprint test tree lines 127-135**:
```
├── [+] parseSecretsInput.test.ts                   # unit: transformer
│   ├── [case1] valid JSON → parsed object
│   ├── [case2] malformed JSON → error with hint
│   └── [case3] empty object → empty record
│
├── filterToManifestKeys.ts
├── [+] filterToManifestKeys.test.ts                # unit: transformer
│   ├── [case1] 10 secrets, 2 declared → 2 returned
│   ├── [case2] 0 declared → 0 returned
│   └── [case3] key declared but not in secrets → absent
```

**case label pattern**: `[caseN] description → expected`

**why it holds**: each test case has `[caseN]` prefix label. the pattern `description → expected` shows BDD structure. positive, negative, and edge cases present for each component.

---

## rule 8: rule.require.test-coverage-by-grain

**rule**: transformers get unit tests, communicators get integration tests, orchestrators get integration tests, contracts get acceptance + snapshots

### test type analysis

| component | grain | blueprint test type | required | adheres? |
|-----------|-------|---------------------|----------|----------|
| parseSecretsInput | transformer | unit (line 126) | unit | yes |
| filterToManifestKeys | transformer | unit (line 132) | unit | yes |
| processOneSecret | orchestrator | integration (line 138) | integration | yes |
| exportGrantedSecrets | communicator | integration (line 146) | integration | yes |
| index | contract | integration + acceptance (line 151, 159) | integration + acceptance | yes |

**snapshot coverage** (lines 176-181):
- all granted → treestruct success
- one blocked → treestruct blocked
- malformed JSON → error message
- keyrack.yml absent → error with hint

**why it holds**: each grain maps to correct test type. contract outputs have snapshot coverage for visual diff in PRs.

---

## rule 9: rule.prefer.lowercase

**rule**: use lowercase for words in comments, logs, output unless required by code convention

### output format analysis

**success output (lines 281-291)**:
```
🔐 keyrack firewall
   ├─ env: test
   └─ grants
      ├─ GITHUB_TOKEN
      │  ├─ mech: EPHEMERAL_VIA_GITHUB_APP
      │  ├─ translated: ghs_*** (1 hour expiry)
      │  └─ status: granted 🔑
```

**lowercase check**:
- field labels: `env`, `grants`, `mech`, `translated`, `status` — all lowercase
- key names: `GITHUB_TOKEN` — uppercase (env var convention)
- mech values: `EPHEMERAL_VIA_GITHUB_APP` — uppercase (enum convention)

**why it holds**: field labels are lowercase as preferred. uppercase used only where convention requires (env vars, enum values).

---

## rule 10: rule.require.treestruct-output

**rule**: CLI skill output must use treestruct format with `├─`, `└─`, `│`

### output format analysis

**success output** uses treestruct markers:
```
   ├─ env: test
   └─ grants
      ├─ GITHUB_TOKEN
      │  ├─ mech: ...
```

**blocked output** uses treestruct markers:
```
   └─ GITHUB_TOKEN
      ├─ status: blocked 🚫
      │  ├─ detected github classic pat (ghp_*)
```

**why it holds**: both success and error outputs follow treestruct format with correct markers. indentation shows hierarchy.

---

## rule 11: rule.forbid.gerunds

**rule**: gerunds (-ing as nouns) forbidden in all names

### component name analysis

| name | has gerund? | analysis |
|------|-------------|----------|
| parseSecretsInput | no | `parse` is verb, `Input` is noun |
| filterToManifestKeys | no | `filter` is verb, `Keys` is noun |
| processOneSecret | no | `process` is verb, `Secret` is noun |
| exportGrantedSecrets | no | `export` is verb, `Secrets` is noun |

**why it holds**: all component names use verb + noun pattern. no -ing suffixes used as nouns.

---

## rule 12: rule.require.ubiqlang

**rule**: use consistent domain vocabulary; eliminate synonyms

### terminology analysis

| term | usage | alternatives avoided |
|------|-------|---------------------|
| secrets | GitHub secrets input | credentials, tokens, keys |
| manifest | keyrack.yml | config, spec, declaration |
| mech | mechanism type | adapter, translator, handler |
| grant | processed credential | result, output, token |
| blocked | firewall rejection | denied, rejected, failed |
| granted | firewall acceptance | allowed, approved, passed |

**why it holds**: each domain concept has one canonical term. no synonyms used interchangeably.

---

## issues found

### issue 1: exit code semantics [FIXED]

**location**: blueprint lines 357-358

**was**:
- malformed secrets JSON → exit 1
- keyrack.yml not found → exit 1

**fixed to**:
- malformed secrets JSON → exit 2 (caller must fix input)
- keyrack.yml not found → exit 2 (caller must fix config)

**status**: fixed in blueprint

**why the fix is correct**: malformed input and absent config are constraint errors — the caller must fix them. malfunction (exit 1) is for server-side issues where retry might help.

---

## verification summary

| rule | check | result |
|------|-------|--------|
| define.domain-operation-grains | 5 components | adheres |
| rule.require.get-set-gen-verbs | 4 verbs | adheres |
| rule.require.input-context-pattern | 5 signatures | adheres |
| rule.require.failfast | error flow | adheres |
| rule.require.exit-code-semantics | 5 errors | **fixed** |
| rule.forbid.inline-decode-friction | mech detection | adheres |
| rule.require.given-when-then | test tree | adheres |
| rule.require.test-coverage-by-grain | 5 components | adheres |
| rule.prefer.lowercase | output labels | adheres |
| rule.require.treestruct-output | output format | adheres |
| rule.forbid.gerunds | component names | adheres |
| rule.require.ubiqlang | domain terms | adheres |

---

## conclusion

**issue fixed**: exit code semantics corrected in blueprint.

the blueprint error cases table (lines 357-358) was updated:
- malformed secrets JSON: exit 1 → exit 2 (caller must fix input)
- keyrack.yml not found: exit 1 → exit 2 (caller must fix config)

this aligns with rule.require.exit-code-semantics: constraint errors (caller-fixable) use exit 2, malfunction errors (server-fixable) use exit 1.

all other mechanic standards are adhered to:
- operation grain classification correct
- verb patterns follow conventions
- input-context pattern followed
- fail-fast behavior explicit
- test coverage by grain correct
- output format follows treestruct
- lowercase labels used
- no gerunds in names
- consistent domain terminology
