# consistent conventions review — keyrack firewall

## review question

for each name choice in the code, ask:
- what name conventions does the codebase use?
- do we use a different namespace, prefix, or suffix pattern?
- do we introduce new terms when prior terms exist?
- does our structure match prior patterns?

---

## codebase patterns identified

**transformers** (`as*`):
- `asKeyrackKeyName`, `asKeyrackKeyEnv`, `asKeyrackKeyOrg`, `asKeyrackKeySlug`
- located in main `keyrack/` directory

**infer functions** (`infer*For*`):
- `inferKeyrackMechForSet`, `inferKeyrackEnvForSet`
- located in main `keyrack/` directory

**output formatters**:
- `formatKeyrackGetOneOutput.ts` — in `keyrack/cli/`
- `emitKeyrackKeyBranch.ts` — in `keyrack/cli/`
- uses `format*` or `emit*` prefix

**subdirectory organization**:
- `session/` — session operations
- `cli/` — CLI output formatters
- `daemon/` — daemon operations
- `adapters/` — vault/mech adapters

---

## new components reviewed

### asKeyrackSlugParts.ts

**location**: main `keyrack/` directory ✓
**prefix**: `asKeyrack*` ✓
**conclusion**: follows prior pattern

### inferKeyrackMechForGet.ts

**location**: main `keyrack/` directory ✓
**prefix**: `inferKeyrack*For*` ✓
**conclusion**: follows prior pattern

### asKeyrackFirewallSource.ts

**location**: main `keyrack/` directory ✓
**prefix**: `asKeyrack*` ✓
**new term**: `Firewall` namespace introduced

**consideration**: introduces feature-specific namespace in main directory. alternative: `asKeyrackSourceSlug.ts` (no feature namespace).

**decision**: keep as-is. the `Firewall` term clarifies this is for the firewall command's `--from` flag, not a general slug parser. the alternative `asKeyrackSourceSlug` would be ambiguous since "source" has different meanings in the codebase.

### getKeyrackFirewallOutput.ts

**location**: main `keyrack/` directory
**prefix**: `get*`

**consideration**: prior output formatters in `cli/` use `format*` or `emit*` prefix:
- `formatKeyrackGetOneOutput.ts`
- `emitKeyrackKeyBranch.ts`

**decision**: keep as-is. this function does more than format — it also:
- writes to `$GITHUB_ENV` file
- outputs `::add-mask::` commands
- handles stdout/file I/O

a pure `format*` would only return a string. this orchestrates output operations, so `get*` prefix is appropriate.

---

## conclusion

new components follow prior name conventions:
- `asKeyrackSlugParts` — `asKeyrack*` pattern ✓
- `inferKeyrackMechForGet` — `inferKeyrack*For*` pattern ✓
- `asKeyrackFirewallSource` — `asKeyrack*` + clarified namespace
- `getKeyrackFirewallOutput` — `get*` for orchestrator (not pure formatter)

no inconsistencies found that require correction.
