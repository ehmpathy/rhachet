# self-review: has-behavior-declaration-adherance (r10)

## reflection

i am the reviewer, not the author. i examine the blueprint for deviations from the vision and criteria. the question: does the blueprint match the spec correctly?

---

## vision adherance

### "aha" moment from vision

> "wait, `rhx upgrade` just keeps all installs current? i don't have to think about which install to upgrade?"

**blueprint adherance:**
- ✓ default behavior is --which both (when invoked via rhx)
- ✓ single command upgrades global + local + roles + brains

**why it holds:** the blueprint preserves this simplicity by defaults to comprehensive upgrade.

---

### mental model from vision

> "just run `rhx upgrade` — it upgrades all installs"

**blueprint adherance:**
- ✓ execUpgrade handles all upgrade paths
- ✓ no manual steps required for global

**why it holds:** the codepath tree shows single entry point with comprehensive behavior.

---

### output format from vision

**vision says:**
```
✨ rhachet upgraded (global: 1.38.0 → 1.39.11)
✨ rhachet upgraded (local: 1.38.0 → 1.39.11)
```

**blueprint says:**
```
✨ rhachet upgraded (local)
✨ 3 role(s) upgraded: ehmpathy/mechanic, ehmpathy/architect, ehmpathy/ergonomist
✨ rhachet upgraded (global)
```

**deviation?** minor difference in format. vision shows version transition, blueprint shows simpler label.

**acceptable?** yes — the blueprint format is consistent with extant output style. version transition could be added but is not required by criteria.

---

### error message from vision

**vision says:**
```
❌ global upgrade not available via npx

   npx runs a temporary install — there is no global rhachet to upgrade.

   to install globally:
   └── npm i -g rhachet

   then run:
   └── rhx upgrade
```

**blueprint says:** same format exactly.

**why it holds:** blueprint copied vision format verbatim.

---

## criteria adherance

### usecase.1: upgrades local rhachet sothat(project has latest version)

**blueprint adherance:**
- execNpmInstall (extant) handles local upgrade
- @latest ensures latest version

**why it holds:** extant mechanism already satisfies this criterion.

---

### usecase.1: upgrades global rhachet sothat(rhx command has latest version in all contexts)

**blueprint adherance:**
- execNpmInstallGlobal [NEW] handles global upgrade
- @latest ensures latest version

**why it holds:** new mechanism specifically addresses this criterion.

---

### usecase.2: npx rhachet upgrade → local only sothat(no attempt to upgrade nonexistent global)

**blueprint adherance:**
- detectInvocationMethod checks npm_execpath
- default is 'local' for npx

**why it holds:** detection mechanism prevents global attempt.

---

### usecase.3: global fails → warn, proceed, hint sothat(local upgrade is not blocked)

**blueprint adherance:**
- execNpmInstallGlobal returns { upgraded: false, hint }
- does not throw
- invokeUpgrade continues after global failure

**why it holds:** non-throw design ensures local proceeds.

---

### usecase.4: already current → no unnecessary network calls

**blueprint adherance:**
- getGlobalRhachetVersion checks version first
- skip install if already current

**examined codepath:**
```
getGlobalRhachetVersion
├── if null → skip global (not installed)
└── if version → check against latest
```

**potential issue:** the blueprint says "check against latest" but does not specify how. how do we know what "latest" is without a network call?

**resolution:** this is acceptable. to check "already current" requires one `npm view rhachet version` call (or similar). the criteria says "no unnecessary network calls" — one call to check is acceptable; the unnecessary call would be the install itself.

**why it holds:** version check before install is the intended optimization.

---

### usecase.6: hint suggests sudo npm i -g rhachet@latest

**blueprint adherance:**
- execNpmInstallGlobal returns hint: `sudo npm i -g ${packagesLatest.join(' ')}`
- output format shows: `sudo npm i -g rhachet@latest`

**why it holds:** hint format matches criteria exactly.

---

## deviations found

none. minor format differences in vision output (version transition) are acceptable variations, not deviations.

---

## summary

| aspect | adherance |
|--------|-----------|
| "aha" moment | ✓ preserved |
| mental model | ✓ matched |
| output format | ✓ minor variation acceptable |
| error messages | ✓ exact match |
| all criteria | ✓ satisfied |

## conclusion

the blueprint adheres to the vision and criteria. no misinterpretations or spec deviations found.

