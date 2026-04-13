# review: behavior-declaration-coverage (round 5)

## slowed down. opened each file. traced each line.

---

## KeyrackKeySpec.ts verification

opened file. searched for `mech`:

```ts
// line 21
mech: KeyrackGrantMechanism | null;
```

comment (lines 17-20):
```ts
/**
 * .what = mechanism constraint for this key, or null if not declared
 * .why = enables firewall to block long-lived tokens when short-lived alternatives exist
 * .note = null means no constraint — vault adapter will prompt for mech selection
 */
```

**verdict**: blueprint requirement satisfied. comment explains the intent correctly.

---

## hydrateKeyrackRepoManifest.ts verification

opened file. searched for `mech:`:

three locations where `mech: null` is set:

1. **line 85** — env.all keys with .all. slug:
```ts
keys[slug] = new KeyrackKeySpec({
  slug,
  mech: null,  // <-- was 'PERMANENT_VIA_REPLICA'
  env: 'all',
  name: key,
  grade,
});
```

2. **line 99** — expanded env.all keys per declared env:
```ts
keys[slug] = new KeyrackKeySpec({
  slug,
  mech: null,  // <-- was 'PERMANENT_VIA_REPLICA'
  env,
  name: key,
  grade,
});
```

3. **line 114** — env-specific keys:
```ts
keys[slug] = new KeyrackKeySpec({
  slug,
  mech: null,  // <-- was 'PERMANENT_VIA_REPLICA'
  env,
  name: key,
  grade,
});
```

**verdict**: all three locations fixed. blueprint requirement satisfied.

---

## mechAdapterGithubApp.ts verification

opened file at line 200-212. found:

```ts
// line 204-207
// expand ~ to home directory (node doesn't do this automatically)
const pemPathExpanded = pemPath
  .trim()
  .replace(/^~(?=$|\/|\\)/, homedir());

// line 212
privateKey = readFileSync(pemPathExpanded, 'utf-8');
```

the regex `/^~(?=$|\/|\\)/` matches:
- `~` at start followed by end of string, `/`, or `\`
- examples: `~`, `~/foo`, `~\foo`

**verdict**: tilde expansion works for all path formats. blueprint requirement satisfied.

---

## criteria trace

| usecase | code location | holds? |
|---------|---------------|--------|
| fill prompts for mech | `inferKeyrackMechForSet` called when `mech: null` | yes |
| ephemeral mech guided setup | `mechAdapterGithubApp.acquireForSet` | yes |
| permanent mech guided setup | `mechAdapterReplica.acquireForSet` | yes |
| manifest declares explicit mech | `inferKeyrackMechForSet` checks `mech !== null` | yes |
| vault single mech auto-select | `inferKeyrackMechForSet` checks `supported.length === 1` | yes |
| tilde expansion | `pemPathExpanded` at line 205-207 | yes |
| parity with set | both use `vault.set()` → `inferKeyrackMechForSet` | yes |

---

## gaps found

none. every requirement traced to code. every code path verified.

---

## verdict

**holds** — all requirements from vision, criteria, and blueprint are implemented. traced each file, each line, each requirement.

