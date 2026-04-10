# self-review: has-questioned-assumptions (r4)

## reflection

i re-examined the blueprint for hidden technical assumptions with fresh eyes.

## assumptions surfaced

### assumption 1: npm_execpath detects npx invocation

**claim:** `process.env.npm_execpath` is set when invoked via npx, not set when invoked via global install.

**what do we assume without evidence?** that npm behavior is consistent across versions.

**evidence gathered:**
- npm sets npm_execpath when it runs a package (documented npm behavior)
- npx uses npm internally, inherits same env vars
- global install runs binary directly — npm is not involved, no npm_execpath

**what if opposite were true?** detection would incorrectly identify global as npx. but:
- tested: global install does not set npm_execpath
- npm docs confirm this is lifecycle-specific

**exceptions?**
- yarn: does not set npm_execpath (out of scope)
- pnpm: may differ (out of scope per vision)

**simpler approach?** checked alternatives:
- argv[1] contains "npx" — fragile, path varies
- npm_lifecycle_event — also works but npm_execpath is more direct

**verdict:** holds. evidence-based, not habit.

---

### assumption 2: npm list -g --json format is stable

**claim:** `npm list -g rhachet --depth=0 --json` returns predictable json structure.

**what do we assume without evidence?** that npm json output format is stable.

**evidence gathered:**
- --json flag is documented npm API
- tested output structure: `{ dependencies: { rhachet: { version: "x.y.z" } } }`
- npm json output has been stable for years

**what if opposite were true?** version extraction would fail. but:
- fallback: return null on parse error
- error is non-fatal (continues without version check)

**exceptions?**
- rhachet not installed: handled — return null
- npm fails: handled — return null

**verdict:** holds. standard API with fallback.

---

### assumption 3: EACCES is reliable permission indicator

**claim:** stderr contains "EACCES" when npm global install fails due to permissions.

**what do we assume without evidence?** that npm exposes EACCES consistently.

**evidence gathered:**
- EACCES is POSIX standard error code (not npm-specific)
- npm writes system errors to stderr
- tested: permission denied shows EACCES

**what if opposite were true?** we miss the specific error. but:
- fallback branch catches all errors
- still returns hint with stderr content

**exceptions?**
- Windows: may use different error code — need to verify
- npm wraps error: EACCES still appears in message

**potential issue found:** Windows may not use EACCES.

**fix needed?** examined Windows behavior:
- Windows uses EPERM for permission errors
- should we check both?

**decision:** add EPERM check for Windows compatibility.

---

### assumption 4: npm install -g is correct for all users

**claim:** `npm install -g rhachet@latest` works for global upgrade.

**what do we assume without evidence?** that users use npm for global installs.

**evidence gathered:**
- vision explicitly scopes to "npm only for MVP"
- volta users: volta manages node but npm install -g still works
- nvm users: npm install -g works

**what if opposite were true?** pnpm/yarn global users would not benefit. but:
- vision explicitly defers non-npm to future scope
- this is documented, not hidden

**exceptions?**
- pnpm global: out of scope per vision
- yarn global: out of scope per vision

**verdict:** holds. scope is explicit in vision.

---

### assumption 5: spawnSync with shell:true is safe

**claim:** shell:true is safe for this use case.

**what do we assume without evidence?** that shell injection is not possible.

**evidence gathered:**
- arguments are hardcoded ('rhachet')
- no user input flows to command
- no string interpolation with external data

**what if opposite were true?** injection risk. but:
- audited: no user input in command construction
- package name is literal string

**verdict:** holds. no injection vector.

---

### assumption 6: order of local/global upgrade does not matter

**claim:** local first, then global, is fine.

**what do we assume without evidence?** that upgrades are independent.

**evidence gathered:**
- local installs to project node_modules/
- global installs to npm prefix
- separate file trees, no cross-dependency

**what if opposite were true?** upgrades could conflict. but:
- tested: they are independent
- npm prefix isolation is documented

**verdict:** holds. independent operations.

---

### assumption 7: --which both means AND, not OR

**claim:** --which both upgrades BOTH local AND global.

**what do we assume without evidence?** that "both" is unambiguous.

**evidence gathered:**
- vision says: "upgrades global" AND "upgrades local"
- criteria confirms: then(upgrades local) AND then(upgrades global)
- "both" in English means "the two together"

**verdict:** holds. explicit in vision/criteria.

---

## issue found and fixed

**issue:** EACCES check may not cover Windows (uses EPERM).

**fix:** update blueprint to check both EACCES and EPERM:

```typescript
if (stderr.includes('EACCES') || stderr.includes('EPERM')) {
  return {
    upgraded: false,
    hint: `sudo npm i -g ${packagesLatest.join(' ')}`,
  };
}
```

**action:** updated blueprint with this fix.

---

## summary

| assumption | verdict | action |
|------------|---------|--------|
| npm_execpath detects npx | holds | none |
| npm list --json is stable | holds | none |
| EACCES permission indicator | **gap** | add EPERM for Windows |
| npm install -g is correct | holds | none |
| shell:true is safe | holds | none |
| order does not matter | holds | none |
| --which both = AND | holds | none |

---

### assumption 8: @latest always resolves to latest published

**claim:** `rhachet@latest` resolves to the most recent published version.

**what do we assume without evidence?** that npm registry behavior is consistent.

**evidence gathered:**
- npm documentation confirms @latest is the default dist-tag
- @latest points to whatever version is tagged as "latest"
- publisher controls the tag — typically the most recent stable

**what if opposite were true?** if @latest were stale, upgrade would not get newest. but:
- @latest is npm's defined behavior
- rhachet uses standard publishing (no custom dist-tags)

**verdict:** holds. standard npm behavior.

---

### assumption 9: output format uses treestruct pattern

**claim:** output should use treestruct format with emojis.

**what do we assume without evidence?** that treestruct is the correct pattern.

**evidence gathered:**
- brief rule.require.treestruct-output mandates this format
- extant upgrade output already uses this pattern
- consistency with other rhachet CLI output

**what if opposite were true?** inconsistent CLI experience. but:
- briefs mandate treestruct
- this is not a new assumption — follows extant patterns

**verdict:** holds. mandated by briefs.

---

### assumption 10: hint suggests sudo for permission errors

**claim:** the hint should suggest `sudo npm i -g`.

**what do we assume without evidence?** that sudo is the fix for permission errors.

**evidence gathered:**
- common npm guidance for global permission issues
- alternatives exist (nvm, npm prefix change) but sudo is simplest

**what if opposite were true?** could suggest `npx` instead. but:
- npx does not solve global install — different use case
- could suggest prefix change but that's more complex

**simpler approach?** just show the error without hint? no — hints are more helpful.

**potential issue:** on Windows, sudo does not exist.

**fix needed?** examined Windows:
- Windows permission errors are less common (user-owned npm prefix)
- when they occur, "Run as Administrator" is the fix
- hint could be OS-aware but adds complexity

**decision:** keep sudo hint. Windows permission errors are rare. document as known limitation.

**verdict:** holds with caveat. sudo hint is appropriate for majority case (Unix).

---

## summary

| assumption | verdict | action |
|------------|---------|--------|
| npm_execpath detects npx | holds | none |
| npm list --json is stable | holds | none |
| EACCES permission indicator | **gap** | add EPERM for Windows |
| npm install -g is correct | holds | none |
| shell:true is safe | holds | none |
| order does not matter | holds | none |
| --which both = AND | holds | none |
| @latest resolves to latest | holds | none |
| treestruct output format | holds | none |
| sudo hint for permission | holds | caveat: Windows |

## conclusion

found one issue: EACCES check should include EPERM for Windows compatibility. fix applied to blueprint.

all other assumptions examined and validated with evidence.

