# self-review: has-questioned-assumptions (r3)

## reflection

i examined the blueprint for hidden technical assumptions. for each, i asked:
- what do we assume without evidence?
- what if the opposite were true?
- is this based on evidence or habit?
- could a simpler approach work?

## assumption 1: npm_execpath detects npx invocation

**the assumption:** `process.env.npm_execpath` is set when invoked via npx, not set when invoked via global install.

**evidence:** researched npm documentation and behavior:
- npm sets `npm_execpath` to the path of the npm CLI binary when it runs a package
- npx is part of npm and sets the same env vars
- when you run `rhx` directly (global install), npm is not involved — no npm_execpath

**what if opposite were true?** if npm_execpath were set for global installs too, detection would fail. but:
- global installs bypass npm — the binary runs directly
- only npm/npx set npm_execpath

**is this evidence or habit?** evidence — npm documentation confirms this behavior.

**counterexamples?**
- yarn: does not set npm_execpath (but yarn is not in scope for this feature)
- pnpm: behavior may differ (but global pnpm is out of scope per vision)

**simpler approach?** could check other signals:
- `npm_lifecycle_event` — also set by npm
- check if process.argv[1] contains "npx" — fragile, path-dependent

current approach (npm_execpath) is robust and documented.

**verdict:** assumption holds. well-grounded in npm behavior.

---

## assumption 2: npm list -g rhachet --json returns version

**the assumption:** `npm list -g rhachet --depth=0 --json` returns json with `dependencies.rhachet.version`.

**evidence:** tested and documented npm behavior:
```json
{
  "dependencies": {
    "rhachet": {
      "version": "1.39.11"
    }
  }
}
```

**what if opposite were true?** if npm changed output format, version detection would break. but:
- npm --json flag is stable API
- `--depth=0` ensures only direct deps
- this is standard npm introspection

**counterexamples?**
- if rhachet not installed: returns exit code 1 or empty deps — handled (return null)
- if npm itself fails: caught, return null

**simpler approach?**
- `rhx --version` — but this runs the binary, slower
- read package.json from global prefix — fragile, prefix varies by platform

current approach is standard npm introspection.

**verdict:** assumption holds. standard npm API.

---

## assumption 3: EACCES indicates permission error

**the assumption:** stderr contains "EACCES" when npm global install fails due to permissions.

**evidence:** npm documentation and observed behavior:
- EACCES is the POSIX error code for permission denied
- npm surfaces this in stderr when it cannot write to global prefix

**what if opposite were true?** if npm changed error format, EACCES detection would miss. but:
- EACCES is a system-level error, not npm-specific
- npm does not localize error codes

**counterexamples?**
- other errors: network, registry down, package not found — all caught by "other errors" branch
- EACCES hidden: would fall through to "other errors" branch — still returns hint

**simpler approach?**
- check exit code only — but exit code 1 is ambiguous
- check for "permission" in stderr — less precise than EACCES

current approach is precise and handles fallback.

**verdict:** assumption holds. EACCES is stable system error code.

---

## assumption 4: npm install -g always works for global

**the assumption:** `npm install -g rhachet@latest` is the correct command for global upgrade.

**evidence:** npm documentation:
- `-g` flag installs to global prefix
- `@latest` resolves to latest published version

**what if opposite were true?** if user uses different package manager globally:
- volta: manages node/npm, but still uses npm for global
- homebrew: rhachet is not in homebrew (out of scope per vision)
- nvm: just manages node versions, npm install -g works

**counterexamples?**
- pnpm global: uses `pnpm add -g` — but vision says "npm only for MVP"
- yarn global: uses `yarn global add` — but vision says npm only

**simpler approach?** no — npm install -g is the standard.

**verdict:** assumption holds. npm global is in scope per vision.

---

## assumption 5: spawnSync with shell:true is safe

**the assumption:** `spawnSync('npm', [...], { shell: true })` is safe to use.

**evidence:** examined code:
- no user input in arguments
- hardcoded package names ('rhachet')
- no string interpolation with external data

**what if opposite were true?** if user input were involved, shell injection risk. but:
- package name is hardcoded
- no dynamic construction from user input

**simpler approach?** could use `shell: false` — but:
- cross-platform npm resolution is easier with shell
- no security concern since no user input

**verdict:** assumption holds. no injection risk with hardcoded args.

---

## assumption 6: global upgrade before local is fine

**the assumption:** order of operations (local first, then global) does not matter.

**evidence:** examined behavior:
- local and global are independent npm prefixes
- upgrading one does not affect the other
- both can fail independently

**what if opposite were true?** could global affect local? no:
- local is in node_modules/
- global is in npm prefix
- separate installations

**simpler approach?** could do them in parallel — but:
- adds complexity
- serial is easier to debug
- no performance need (both are fast)

**verdict:** assumption holds. order does not matter.

---

## assumption 7: --which both means local AND global

**the assumption:** `--which both` implies upgrading both local and global.

**evidence:** explicit in vision:
> "default upgrade (rhx) → both"

and in criteria:
> "rhx upgrade --which both → upgrades local AND global"

**what if opposite were true?** "both" could mean "either" — but:
- vision is explicit: "upgrades global rhachet" AND "upgrades local rhachet"
- criteria confirms: "then(upgrades local)" AND "then(upgrades global)"

**verdict:** assumption holds. vision and criteria are explicit.

---

## summary

| assumption | verdict | basis |
|------------|---------|-------|
| npm_execpath detects npx | holds | npm documentation |
| npm list --json returns version | holds | standard npm API |
| EACCES indicates permission | holds | POSIX error code |
| npm install -g is correct | holds | vision scope (npm only) |
| spawnSync shell:true is safe | holds | no user input |
| order does not matter | holds | independent prefixes |
| --which both = AND | holds | explicit in vision |

no hidden assumptions found that lack evidence or are based purely on habit.

## conclusion

all technical assumptions examined. each holds with documented evidence.

