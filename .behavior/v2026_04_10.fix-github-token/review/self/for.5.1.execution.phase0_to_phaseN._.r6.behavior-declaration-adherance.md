# review: behavior-declaration-adherance (round 6)

## slowed down. examined each diff line by line.

---

## diff 1: KeyrackKeySpec.ts

```diff
-   * .what = mechanism constraint for this key
+   * .what = mechanism constraint for this key, or null if not declared
    * .why = enables firewall to block long-lived tokens when short-lived alternatives exist
+   * .note = null means no constraint — vault adapter will prompt for mech selection
    */
-  mech: KeyrackGrantMechanism;
+  mech: KeyrackGrantMechanism | null;
```

**blueprint says:**
```diff
- mech: KeyrackGrantMechanism;
+ mech: KeyrackGrantMechanism | null;
```

**adherance:**
- type change matches exactly ✓
- added comment explains null semantics (improvement, not deviation) ✓

---

## diff 2: hydrateKeyrackRepoManifest.ts

three identical changes:

```diff
-      mech: 'PERMANENT_VIA_REPLICA',
+      mech: null,
```

**blueprint says:**
```diff
  keys[slug] = new KeyrackKeySpec({
    slug,
-   mech: 'PERMANENT_VIA_REPLICA',
+   mech: null,
    env: 'all',
```

**adherance:**
- line 85: env.all keys with .all. slug — matches blueprint ✓
- line 99: expanded env.all keys — matches blueprint ✓
- line 114: env-specific keys — matches blueprint ✓
- no other changes to this file — minimal change ✓

---

## diff 3: mechAdapterGithubApp.ts

```diff
+ import { homedir } from 'node:os';

...

-      // read and format pem content
+      // expand ~ to home directory (node doesn't do this automatically)
+      const pemPathExpanded = pemPath
+        .trim()
+        .replace(/^~(?=$|\/|\\)/, homedir());
+
+      // read pem content
       let privateKey: string;
       try {
-        privateKey = readFileSync(pemPath.trim(), 'utf-8');
+        privateKey = readFileSync(pemPathExpanded, 'utf-8');
       } catch (err) {
         throw new UnexpectedCodePathError('failed to read pem file', {
-          pemPath,
+          pemPath: pemPathExpanded,
           error: err,
```

**blueprint says:**
```diff
+ import { homedir } from 'os';
...
+ const pemPathExpanded = pemPath.trim().replace(/^~(?=$|\/|\\)/, homedir());
- privateKey = readFileSync(pemPath.trim(), 'utf-8');
+ privateKey = readFileSync(pemPathExpanded, 'utf-8');
```

**adherance:**
- import added: `from 'node:os'` vs blueprint's `from 'os'` — equivalent (node: prefix is modern convention) ✓
- regex matches blueprint: `/^~(?=$|\/|\\)/` ✓
- readFileSync now uses pemPathExpanded ✓
- error metadata updated to use pemPathExpanded — improvement, easier debug ✓

---

## vision adherance (final check)

| vision quote | diff evidence |
|--------------|---------------|
| "fill prompts which mechanism?" | mech: null enables prompt via inferKeyrackMechForSet |
| "same flow as set" | no changes to flow logic — both use vault.set() |
| "guided setup proceeds accordingly" | no changes to mech adapter guided setup logic |
| "tilde expansion" | pemPathExpanded with homedir() replacement |

---

## criteria adherance (final check)

| criterion | satisfied by |
|-----------|--------------|
| usecase.6: pem path with tilde | diff 3: `replace(/^~/, homedir())` |
| usecase.1-5, 7: mech prompt parity | diff 1-2: mech: null enables prompts |

---

## deviations found

none. every diff line matches the blueprint. minor improvements (comments, error metadata) do not deviate from spec.

---

## verdict

**holds** — each diff line adheres to behavior declaration. no misinterpretation. no drift.

