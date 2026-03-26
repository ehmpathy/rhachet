# review: has-pruned-backcompat

## the question

backcompat asks: did we add backwards compatibility code that was not necessary?

## files reviewed

- `src/contract/cli/invokeEnroll.ts` — CLI command implementation
- `src/domain.operations/enroll/enrollBrainCli.ts` — brain spawn logic
- `src/domain.operations/enroll/genBrainCliConfigArtifact.ts` — config generation
- `src/domain.operations/enroll/computeBrainCliEnrollment.ts` — role computation
- `src/domain.operations/enroll/parseBrainCliEnrollmentSpec.ts` — spec parse

## deep review

### default roles behavior

**rolesDefault = rolesLinked** — when no `--roles` flag, all linked roles become the default.

- question: is this backwards compatibility?
- analysis: no. this is the specified behavior from criteria usecase.7: "no roles flag uses defaults". the defaults are derived from linked roles.
- decision: not backcompat code — it's the primary behavior path.

### settings.json read

**settings.json read** — reads extant settings before the code generates settings.local.json.

- question: is this backwards compatibility with extant settings?
- analysis: no. this is mechanism, not backcompat. we read settings.json to discover which hooks exist, then filter by enrolled roles, then write settings.local.json. we don't preserve unrelated settings — we generate a fresh local config.
- decision: not backcompat code — it's the hook discovery mechanism.

### brain command lookup

**brainCommands map** — maps 'claude' and 'claude-code' to 'claude'.

location: `src/domain.operations/enroll/enrollBrainCli.ts:51-54`

```ts
const brainCommands: Record<string, string> = {
  claude: 'claude',
  'claude-code': 'claude',
};
```

- question: is 'claude-code' → 'claude' backwards compatibility?
- analysis: yes, this is mild backcompat. users might type either name. however, it's two lines of code in a map literal. cost is near-zero.
- open question for wisher: should we remove 'claude-code' alias and require exact 'claude'?
- decision: acceptable for now. two strings in a map. no abstraction, no complexity. can delete if wisher confirms unnecessary.

### passthrough args

**filterOutRolesArg** — removes `--roles` from args passed to brain.

- question: is this backwards compatibility?
- analysis: no. this is explicit requirement from criteria usecase.14: passthrough of other args. we must not pass `--roles` to the brain (it's our flag), but we must pass all other args. this is forward design, not backcompat.
- decision: not backcompat code — it's the explicit requirement.

## extras check

| potential backcompat | found? | cost |
|---------------------|--------|------|
| legacy env var support | no | - |
| old config format read | no | - |
| deprecated flag alias | no | - |
| migration code | no | - |
| version detect | no | - |
| fallback paths | no | - |

none of these were added.

## conclusion

one mild backcompat item found: 'claude-code' → 'claude' alias in brain lookup. cost is two strings in a map literal. no abstraction overhead, no version checks, no migration code. acceptable.

