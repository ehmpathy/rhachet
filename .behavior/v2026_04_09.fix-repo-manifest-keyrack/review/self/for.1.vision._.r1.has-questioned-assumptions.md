# self-review: has-questioned-assumptions

## assumptions surfaced and questioned

### 1. role packages use `src/` → `dist/` convention

**source:** vision document, derived from wish rsync example

**did wisher say this?** implicitly — the rsync command uses `src/ dist/`

**evidence:** standard TypeScript convention, ehmpathy packages follow this

**what if opposite were true?** some packages use `lib/` instead of `dist/`

**verdict:** assumption holds for rhachet-roles-* packages. these are ehmpathy packages, and we control the convention.

---

### 2. extant rsync patterns are consistent across packages

**source:** inferred from single rsync example in wish

**did wisher say this?** no, i inferred it

**evidence:** only one example provided

**what if patterns vary?** we'd need to pick a canonical pattern or handle variations

**verdict:** assumption needs validation. research phase should audit real packages. flagged.

---

### 3. --include/--exclude syntax mirrors rsync

**source:** vision document

**did wisher say this?** wisher said "allow them to add their own --exclude and --include overrides"

**evidence:** rsync syntax is familiar to users

**what if we used different syntax?** users would need to learn new syntax

**verdict:** assumption holds — familiarity matters. we need similar semantics, not 1:1 parity.

---

### 4. hidden assumption: dist/ is safe to overwrite

**surfaced:** i assumed dist/ is safe because it's typically gitignored

**evidence:** standard convention for build output

**what if dist/ is not gitignored?** user could lose uncommitted changes

**verdict:** risky assumption. command should warn or validate. add to edgecases.

---

### 5. hidden assumption: rhachet is already a build-time dependency

**surfaced:** vision says "roles depend on rhachet at build time (but they already do at runtime)"

**evidence:** role packages import from rhachet or rhachet-roles-*

**what if a role doesn't use rhachet at runtime?** this adds a new dependency

**verdict:** assumption holds — target audience is rhachet role authors. they already have rhachet.

---

### 6. hidden assumption: rsync semantics are the right model

**surfaced:** we assume file copy with include/exclude is correct approach

**what if we need transformation?** some artifacts might need to be processed

**evidence:** extant rsync just copies — no transformation needed today

**verdict:** assumption holds for v1. if transformation emerges, we can add it.

---

## summary

| assumption | verdict |
|------------|---------|
| src/ → dist/ convention | holds — ehmpathy standard |
| rsync patterns consistent | needs validation in research |
| include/exclude like rsync | holds — familiarity > precision |
| dist/ safe to overwrite | risky — add warn or validation |
| rhachet is build dependency | holds — target audience has it |
| copy semantics sufficient | holds for v1 |

## actions

1. research phase: audit real rhachet-roles-* packages for rsync pattern variations
2. add edgecase: what if dist/ has uncommitted changes? (warn or fail-fast)
