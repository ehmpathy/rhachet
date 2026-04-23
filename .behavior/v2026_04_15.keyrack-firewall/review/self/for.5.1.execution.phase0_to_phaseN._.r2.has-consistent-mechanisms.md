# consistent mechanisms review — keyrack firewall

## review question

for each new mechanism in the code, ask:
- does the codebase already have a mechanism that does this?
- do we duplicate prior utilities or patterns?
- could we reuse a prior component instead of a new one?

---

## components reviewed

### 1. asKeyrackSlugParts.ts

**duplicates prior?** yes — found issue

**issue**: env extraction duplicated `parts[1] ?? ''` instead of using prior `asKeyrackKeyEnv.ts`

**fix applied**:
```typescript
// before
const parts = input.slug.split('.');
const env = parts[1] ?? '';

// after
const env = asKeyrackKeyEnv({ slug: input.slug });
```

**verification**: `rhx git.repo.test --what unit --scope asKeyrackSlugParts` — 4 passed

### 2. asKeyrackFirewallSource.ts

**duplicates prior?** no

**checked**: searched for slug parsing patterns in codebase
- `asKeyrackKeySlug.ts` — constructs slug from parts (inverse direction)
- no prior `--from` style URI parsing found

**conclusion**: new capability, no duplication

### 3. inferKeyrackMechForGet.ts

**duplicates prior?** no

**checked**: searched for mech inference patterns
- `inferKeyrackMechForSet.ts` — prompts user for mech during set (different usecase)
- no prior "detect mech from JSON blob" pattern found

**conclusion**: new capability for the wish (mech translation in CI)

### 4. getKeyrackFirewallOutput.ts

**duplicates prior?** no

**checked**: searched for github.actions output patterns
- no prior `::add-mask::` output logic found
- no prior `$GITHUB_ENV` write logic found

**conclusion**: new capability for the wish (CI output format)

---

## conclusion

found one issue: `asKeyrackSlugParts.ts` duplicated env extraction instead of using prior `asKeyrackKeyEnv.ts`. fixed by importing and using the prior transformer.

other new components are new capabilities, not duplications of prior mechanisms.
