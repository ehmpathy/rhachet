# self-review: has-questioned-deletables (round 2)

## question

can any features or components be deleted? did we add features not in the requirements?

## feature traceability

| feature | traces to | verdict |
|---------|-----------|---------|
| failfast guard | wish: "failfast to guard against roles" | keep |
| findRolesWithBootableButNoHook | vision: "lists affected roles" | keep |
| assertRegistryBootHooks | vision: "introspect fails" | keep |
| treestruct error format | vision: "turtle vibes" error example | keep |
| "has:" line in error | vision: "shows which dirs" | keep |
| "hint:" line in error | vision: "shows hint" | keep |
| "why:" explanation | vision: "teaches the pattern" | keep |
| test fixture for failure | criteria: usecase.2 invalid registry | keep |

**no features without traceability found.**

## component simplification analysis

### could findRolesWithBootableButNoHook be inlined?

**question**: could we inline the find logic into assertRegistryBootHooks?

**analysis**:
- pros of inline: one file instead of two
- cons of inline: harder to unit test find logic, breaks extant pattern
- extant pattern: assertRegistrySkillsExecutable calls findNonExecutableShellSkills

**verdict**: keep separated — follows established pattern, improves testability

### could RoleBootHookViolation be simpler?

**question**: could we just return string[] of role slugs instead of structured violation objects?

**analysis**:
- vision requires: "shows which dirs are declared"
- need to know: hasBriefsDirs, hasSkillsDirs per role
- simplified (string[]): loses this info, violates vision
- structured (violation object): carries required info

**verdict**: keep structured — required by vision

### could we skip the test fixture?

**question**: could we test failure case without a dedicated fixture?

**analysis**:
- acceptance tests need real registry package
- failure case needs role without onBoot hook
- could modify extant fixture conditionally? — adds complexity, reduces clarity
- dedicated fixture: clear, isolated, follows extant pattern

**verdict**: keep dedicated fixture — clearer, follows pattern

### could we have fewer test cases?

**question**: are 8 unit test cases for find excessive?

**analysis**:
- case1-4: core matrix (briefs × skills × onBoot)
- case5: typed-skills-only exception (from criteria usecase.3)
- case6: empty array edge (from criteria boundary)
- case7: undefined hooks edge
- case8: multiple roles

**verdict**: keep all — each maps to criteria or boundary condition

## conclusion

**no deletable components found.**

every feature traces to vision or criteria. every component follows established patterns. simplification attempts would violate requirements.

## why it holds

1. **features are minimal**: no "nice to have" additions
2. **components follow extant patterns**: find + assert separation matches assertRegistrySkillsExecutable
3. **type structure is requirements-driven**: violation type carries info needed for error message
4. **test cases map to criteria**: no speculative coverage

## verdict

**pass** — all components are necessary and traceable.
