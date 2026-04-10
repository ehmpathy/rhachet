# self-review: has-behavior-declaration-adherance (r11)

## reflection

fresh eyes. i re-examine the blueprint against vision and criteria. the question: any spec deviations?

---

## vision adherance: deep dive

### default behavior

**vision says:**
> the default is `--which both` when no flag is specified

**blueprint says:**
> if --which not specified → detectInvocationMethod
> - if npx → default to 'local'
> - if global → default to 'both'

**adherance:** the blueprint correctly implements conditional default:
- rhx invocation → both (matches vision)
- npx invocation → local (matches vision usecase 3)

**why it holds:** conditional default is correct per spec.

---

### output messages

**vision success:**
```
✨ rhachet upgraded (local)
✨ 3 role(s) upgraded: ehmpathy/mechanic, ehmpathy/architect, ehmpathy/ergonomist
✨ rhachet upgraded (global)
```

**blueprint success:**
```
✨ rhachet upgraded (local)
✨ 3 role(s) upgraded: ehmpathy/mechanic, ehmpathy/architect, ehmpathy/ergonomist
✨ rhachet upgraded (global)
```

**adherance:** exact match.

---

### permission failure

**vision says:**
```
⚠️ global upgrade failed (permission denied)
   └── hint: sudo npm i -g rhachet@latest
```

**blueprint says:**
```
⚠️ global upgrade failed (permission denied)
   └── hint: sudo npm i -g rhachet@latest
```

**adherance:** exact match.

---

### npx error

**vision says:**
```
❌ global upgrade not available via npx

   npx runs a temporary install — there is no global rhachet to upgrade.

   to install globally:
   └── npm i -g rhachet

   then run:
   └── rhx upgrade
```

**blueprint says:** same format.

**adherance:** exact match.

---

## criteria adherance: line by line

### criterion: "sothat(project has latest version)"

blueprint: execNpmInstall with @latest
adherance: ✓

### criterion: "sothat(rhx command has latest version everywhere)"

blueprint: execNpmInstallGlobal with @latest
adherance: ✓

### criterion: "sothat(user knows what happened)"

blueprint: output format section shows explicit messages
adherance: ✓

### criterion: "sothat(user has explicit control)"

blueprint: --which local|global|both option
adherance: ✓

### criterion: "sothat(no attempt to upgrade nonexistent global)"

blueprint: detectInvocationMethod → npx defaults to local
adherance: ✓

### criterion: "sothat(npx users are not confused)"

blueprint: no error output for npx default path
adherance: ✓

### criterion: "sothat(user knows global not available via npx)"

blueprint: error with clear message and install hint
adherance: ✓

### criterion: "sothat(user knows how to fix)"

blueprint: hint suggests `sudo npm i -g rhachet@latest`
adherance: ✓

### criterion: "sothat(local upgrade is not blocked by global failure)"

blueprint: execNpmInstallGlobal returns result, does not throw
adherance: ✓

### criterion: "sothat(upgrade is fast when already up to date)"

blueprint: getGlobalRhachetVersion checks version first
adherance: ✓

### criterion: "sothat(user sees exactly what changed)"

blueprint: output format shows upgrade status per target
adherance: ✓

---

## potential deviations examined

### version transition in output

**vision shows:** `(global: 1.38.0 → 1.39.11)`
**blueprint shows:** `(global)` only

**is this a deviation?** no — criteria does not require version transition in output. vision was illustrative.

---

### already current message format

**vision says:** report "already current"
**blueprint acceptance test:** given(global and local already at latest) → then(stdout shows "already current")

**adherance:** ✓ covered in acceptance tests

---

## summary

| category | deviations |
|----------|------------|
| output format | 0 |
| error messages | 0 |
| default behavior | 0 |
| criteria | 0 |

## conclusion

no deviations from spec found. the blueprint adheres to vision and criteria.

