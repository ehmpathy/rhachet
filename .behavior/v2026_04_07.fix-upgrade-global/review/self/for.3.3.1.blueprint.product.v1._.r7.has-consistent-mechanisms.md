# self-review: has-consistent-mechanisms (r7)

## reflection

i searched the codebase for related patterns and examined each new mechanism in the blueprint for duplication.

## codebase search

### search: spawnSync usage

found 24 files that use spawnSync. relevant one is `src/domain.operations/upgrade/execNpmInstall.ts`.

### search: npm_execpath

no extant usage found. this is a new pattern.

### search: npm list -g

no extant usage found. this is a new pattern.

---

## mechanism review

### detectInvocationMethod.ts

**what it does:** checks `npm_execpath` env var to detect npx vs global invocation.

**does extant mechanism exist?** no.
- searched for `npm_execpath` — no results
- searched for invocation detection — no results

**why it holds:** this is new functionality. no duplication.

---

### getGlobalRhachetVersion.ts

**what it does:** runs `npm list -g rhachet --json` and parses version.

**does extant mechanism exist?** no.
- searched for `npm list.*-g` — no results
- this capability does not exist in the codebase

**why it holds:** this is new functionality. no duplication.

---

### execNpmInstallGlobal.ts

**what it does:** runs `npm install -g rhachet@latest` and handles EACCES/EPERM.

**does extant mechanism exist?** partial — `execNpmInstall.ts` exists for local installs.

**examined extant mechanism:**
```typescript
// execNpmInstall.ts
export const execNpmInstall = (input, context) => {
  const pm = detectPackageManager({ cwd });  // pnpm or npm
  const result = spawnSync(pm, ['install', ...packagesLatest], { stdio: 'inherit' });
  if (result.status !== 0) throw new UpgradeExecutionError(...)
};
```

**differences:**
| aspect | execNpmInstall (local) | execNpmInstallGlobal (new) |
|--------|----------------------|---------------------------|
| scope | local project | global npm |
| pm detection | yes (pnpm/npm) | no (always npm) |
| stdio | inherit | pipe |
| on error | throws | returns { upgraded: false, hint } |
| EACCES | not handled | returns hint |

**could we reuse execNpmInstall?**
- no: different error strategy (throw vs return)
- no: different pm logic (detect vs always npm)
- no: different stdio (inherit vs pipe for stderr capture)

**could we extract shared code?**
- the treestruct output log could be shared
- but that's a small overlap

**why it holds:** the mechanisms are similar in purpose but different in behavior. reuse would require significant abstraction that would complicate both. separate is simpler.

---

### execUpgrade.ts changes

**what it does:** extends extant execUpgrade to add global upgrade logic.

**does extant mechanism exist?** yes — this IS the extant mechanism.

**examined pattern:**
- blueprint extends, does not duplicate
- adds `which` parameter
- adds global upgrade call after local
- follows extant patterns in the file

**why it holds:** extends extant mechanism, does not duplicate.

---

### invokeUpgrade.ts changes

**what it does:** adds --which option to cli.

**does extant mechanism exist?** yes — this IS the extant cli handler.

**examined pattern:**
- blueprint extends, does not duplicate
- follows extant option patterns
- uses extant output format (treestruct)

**why it holds:** extends extant mechanism, does not duplicate.

---

## potential shared patterns

### treestruct output

both `execNpmInstall` and `execNpmInstallGlobal` output treestruct format. examined:

```typescript
// extant in execNpmInstall.ts
console.log(`📦 upgrade (${pm})`);
packagesLatest.forEach((pkg, i) => {
  const isLast = i === packagesLatest.length - 1;
  const prefix = isLast ? '└──' : '├──';
  console.log(`   ${prefix} ${pkg}`);
});
```

**could we extract?** yes, but:
- it's 6 lines
- used in 2 places
- not worth extraction overhead

**why it holds:** inline is simpler than extraction for this size.

---

## summary

| mechanism | extant? | action | verdict |
|-----------|---------|--------|---------|
| detectInvocationMethod | no | new | ✓ not duplicate |
| getGlobalRhachetVersion | no | new | ✓ not duplicate |
| execNpmInstallGlobal | partial | new (different behavior) | ✓ justified |
| execUpgrade changes | yes | extend | ✓ extends extant |
| invokeUpgrade changes | yes | extend | ✓ extends extant |

## conclusion

no unjustified duplication found:
- new mechanisms are genuinely new functionality
- extant mechanisms are extended, not duplicated
- similar patterns (treestruct) are too small to extract

