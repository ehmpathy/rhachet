# self-review r9: has-role-standards-coverage

review for coverage of mechanic role standards — what could be absent?

---

## step 1: what standards could apply to this fix?

the fix is:
1. one-line extraction: `const orgFromSlug = slug.split('.')[0]!`
2. one property change: `org: repoManifest.org` → `org: orgFromSlug`
3. one new test case

---

## step 2: check for absent standards

### error treatment

**question**: should we add error treatment for malformed slugs?

**answer**: no. slugs are validated at hydration time. defensive code here would be YAGNI.

✓ not absent — correct layer handles this.

### type safety

**question**: should `orgFromSlug` have an explicit type?

**answer**: no. TypeScript infers `string` from `slug.split('.')[0]`. explicit type would be redundant.

✓ not absent — inference suffices.

### comments

**question**: should the fix have a `.what` / `.why` comment?

**answer**: the fix is one line that extracts org from slug. the code is self-evident:
```ts
const orgFromSlug = slug.split('.')[0]!;
```

a comment would duplicate what the code says.

✓ not absent — code is self-documenting.

### test coverage

**question**: should we add unit tests in addition to integration tests?

**answer**: no. the fix is inside an integration-level function (`fillKeyrackKeys`). the behavior change is best tested at integration level where the full roundtrip can be verified.

✓ not absent — integration test is the appropriate scope.

### validation

**question**: should we validate that `orgFromSlug` is non-empty?

**answer**: no. slugs come from hydrated manifests. the hydration layer validates format. validation here would duplicate upstream checks.

✓ not absent — upstream layer handles this.

---

## step 3: final check — did we miss any brief categories?

| category | checked | result |
|----------|---------|--------|
| error treatment | yes | ✓ handled at correct layer |
| type safety | yes | ✓ inference suffices |
| comments | yes | ✓ code is self-documenting |
| test coverage | yes | ✓ integration scope correct |
| validation | yes | ✓ upstream layer handles |

no absent standards found.

---

## summary

the fix is minimal and focused:
- one extraction line
- one property change
- one test case

all relevant mechanic standards are satisfied. no additions needed.

