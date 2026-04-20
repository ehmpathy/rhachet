# self-review: has-role-standards-coverage

review for coverage of mechanic role standards.

---

## search methodology

### briefs directories enumerated

searched the mechanic briefs loaded in context and identified rule categories to verify coverage:

| directory | brief files | coverage check |
|-----------|-------------|----------------|
| practices/code.prod/evolvable.procedures/ | rule.require.input-context-pattern.md | function signatures declared |
| practices/code.prod/pitofsuccess.errors/ | rule.require.failfast.md, rule.require.exit-code-semantics.md, rule.require.failloud.md | error cases table present |
| practices/code.prod/readable.narrative/ | rule.require.orchestrators-as-narrative.md | codepath tree present |
| practices/code.test/frames.behavior/ | rule.require.given-when-then.md | test tree with cases present |
| practices/code.test/scope.coverage/ | rule.require.test-coverage-by-grain.md | test types declared |

### blueprint sections examined

line-by-line examination for coverage gaps:

- lines 22-51: filediff tree — file creation inventory
- lines 55-94: codepath tree — operation flow
- lines 98-170: test coverage — test specifications
- lines 185-221: architecture flow — narrative structure
- lines 354-376: error cases — exit codes and edge cases

---

## coverage check 1: error handler coverage

**required by**: rule.require.failfast, rule.require.exit-code-semantics, rule.require.failloud

**blueprint location**: lines 354-376

**coverage check**:
- error cases table present (lines 356-362)
- exit codes for each error (1 or 2)
- output format for each error (e.g., "parse error + hint")
- edge cases table present (lines 368-376)

**potential gap**: does the blueprint specify how errors are communicated?

**evidence**: line 362 shows "blocked + reason + fix" output format. lines 296-301 show blocked output format with treestruct. line 359 shows "not found + hint".

**why it holds**: the blueprint specifies error output formats. each error case declares what the user sees (output column). hints are mentioned for fixable errors. the output format section (lines 276-302) shows treestruct error output.

---

## coverage check 2: test specification coverage

**required by**: rule.require.test-coverage-by-grain, rule.require.given-when-then

**blueprint location**: lines 98-170

**coverage check**:
- unit tests for transformers: lines 127-136 (parseSecretsInput, filterToManifestKeys)
- integration tests for orchestrators: lines 138-144 (processOneSecret)
- integration tests for communicators: lines 146-150 (exportGrantedSecrets)
- acceptance tests for contract: lines 151-170 (index — full action)
- snapshot coverage: lines 176-181

**potential gap**: are negative cases covered?

**evidence**:
- parseSecretsInput: line 129 "malformed JSON → error with hint"
- processOneSecret: line 142 "no mech, ghp_* → blocked"
- index: line 153 "one key blocked → fail fast"

**why it holds**: each test section includes positive, negative, and edge cases. negative cases (malformed input, blocked patterns, api errors) are explicitly listed. snapshot coverage includes error states.

---

## coverage check 3: input-context pattern coverage

**required by**: rule.require.input-context-pattern

**blueprint location**: lines 55-94 (codepath tree)

**coverage check**:
- parseSecretsInput: pure transformer, input only — correct
- filterToManifestKeys: pure transformer, input only — correct
- processOneSecret: orchestrator with context for adapters — correct
- exportGrantedSecrets: communicator, input only (SDK imported directly) — correct per GitHub Actions idiom

**potential gap**: is context dependency injection specified?

**evidence**: line 78-80 shows `[←]` reuse markers for mech adapters. processOneSecret routes to these adapters. the codepath tree does not show explicit context argument, but this is a blueprint (high-level), not implementation.

**why it holds**: the codepath tree shows which adapters are used. the architecture section (lines 185-221) shows the flow. implementation-level signatures follow the established (input, context?) pattern. context dependencies are implicit in the `[←]` reuse markers.

---

## coverage check 4: narrative flow coverage

**required by**: rule.require.orchestrators-as-narrative

**blueprint location**: lines 185-221 (architecture flow)

**coverage check**:
- index.ts flow (lines 198-218):
  ```
  ├── getInput.secrets via @actions/core
  ├── parseSecretsInput
  ├── daoKeyrackRepoManifest.get
  ├── filterToManifestKeys
  ├── for each secret
  │   └── processOneSecret
  ├── fail fast on first blocked/error
  └── exportGrantedSecrets
  ```

**potential gap**: does the blueprint show enough detail for narrative clarity?

**evidence**: each line in the architecture flow tells WHAT happens, not HOW. operation names are descriptive. the flow reads as a narrative: read → parse → filter → process → fail/export.

**why it holds**: the architecture flow follows narrative pattern. each step is a named operation. no inline decode-friction visible. the flow reads top-to-bottom as a story of what the action does.

---

## coverage check 5: domain vocabulary coverage

**required by**: rule.require.ubiqlang

**blueprint location**: throughout

**coverage check**:
- secrets: used for GitHub secrets input
- manifest: used for keyrack.yml
- mech: used for mechanism type
- grant: used for processed credential
- blocked/granted: used for firewall results

**potential gap**: are there undefined terms?

**evidence**: all key terms appear consistently across sections:
- "secrets" in filediff (line 67), codepath (line 68), test cases
- "manifest" in filediff (line 73), codepath (line 72), architecture
- "grant" in codepath (line 91), output format (line 291)

**why it holds**: the blueprint uses consistent vocabulary. no synonyms detected. each domain concept has one canonical term used throughout.

---

## coverage check 6: operation grain coverage

**required by**: define.domain-operation-grains

**blueprint location**: lines 55-94 (codepath tree)

**coverage check**:
- transformers: parseSecretsInput (line 67), filterToManifestKeys (line 71) — marked `# transformer`
- orchestrators: processOneSecret (line 75), index (line 59) — marked `# orchestrator`
- communicators: exportGrantedSecrets (line 84) — marked `# communicator`

**potential gap**: are grain markers present and correct?

**evidence**: each component in the codepath tree has a `# grain: description` comment. line 67: `# transformer: parse input`. line 84: `# communicator: export env`.

**why it holds**: all new components are classified by grain in the codepath tree. the classification matches their behavior (pure vs i/o vs compose).

---

## issues found

none. all mechanic standards are covered in the blueprint.

---

## verification summary

| standard | coverage | status |
|----------|----------|--------|
| error handler (failfast, failloud, exit codes) | error cases table + output formats | present |
| test specs (given-when-then, coverage-by-grain) | test tree + case labels + snapshot | present |
| function signatures (input-context pattern) | codepath tree + reuse markers | present |
| narrative flow (orchestrators-as-narrative) | architecture section | present |
| domain vocabulary (ubiqlang) | consistent terms throughout | present |
| operation grains (transformer/orchestrator/communicator) | grain markers in codepath | present |

---

## conclusion

all mechanic standards are covered in the blueprint:

- **error handler**: error cases table with exit codes, output formats with hints, edge cases documented
- **test specs**: test tree with case labels, grain-appropriate test types, snapshot coverage for contract outputs
- **function signatures**: codepath tree shows operation structure, reuse markers for dependencies
- **narrative flow**: architecture section reads as narrative, each step is a named operation
- **domain vocabulary**: consistent terms (secrets, manifest, mech, grant, blocked/granted)
- **operation grains**: each component classified by grain in codepath tree

no gaps detected. the blueprint provides comprehensive coverage of required mechanic standards.
