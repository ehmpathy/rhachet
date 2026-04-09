# self-review r2: has-ergonomics-reviewed (deeper)

## each input/output examined

### journey 1: github app set

**input 1: command invocation**
```
$ rhx keyrack set --key GITHUB_TOKEN --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP
```
- feels natural? ✓ standard flag pattern
- can we simplify? not really — all three flags needed for explicit invocation
- friction? the --mech name is verbose but memorable

**input 2: org selection**
```
├─ which org?
│  ├─ options
│  │  ├─ 1. ehmpathy
│  │  └─ 2. bhuild
│  └─ choice
│     └─ 1 ✓
```
- feels natural? ✓ numbered list, type a number
- output clear? ✓ shows selected org inline

**input 3: app selection**
```
├─ which app?
│  ├─ options
│  │  ├─ 1. beaver-by-bhuild (id: 3234162)
│  │  └─ 2. seaturtle-ci (id: 8234521)
│  └─ choice
│     └─ 1 ✓
```
- feels natural? ✓ same pattern as org
- shows id? ✓ helpful for verification

**input 4: pem path**
```
├─ where's the private key?
│  └─ path
│     └─ ./beaver.2026-04-01.pem ✓
```
- feels natural? neutral — must type path
- can we simplify? no — we cannot guess where file lives
- improvement idea: could we support drag-and-drop in terminal? out of scope for v1

**output: verification and success**
```
└─ verify...
   ├─ ✓ unlock
   ├─ ✓ get
   └─ ✓ relock

🔐 keyrack set (org: ehmpathy, env: all)
   └─ ehmpathy.all.GITHUB_TOKEN
      ├─ mech: EPHEMERAL_VIA_GITHUB_APP
      └─ vault: os.secure
```
- clear? ✓ shows verification steps and final state
- actionable? ✓ user knows it worked

---

### journey 2: aws sso with mech inference

**input: command without --mech**
```
$ rhx keyrack set --key AWS_PROFILE --vault aws.config
```
- feels natural? ✓ minimal flags, mech prompted

**output: mech selection**
```
├─ which mechanism?
│  ├─ options
│  │  ├─ 1. aws sso (EPHEMERAL_VIA_AWS_SSO) — short-lived tokens via browser
│  │  └─ 2. aws key (PERMANENT_VIA_AWS_KEY) — long-lived access key
│  └─ choice
│     └─ 1 ✓
```
- clear? ✓ shows both mech name and human description
- discoverable? ✓ user learns what options exist

---

### journey 4: vault inference

**input: key name only**
```
$ rhx keyrack set --key AWS_PROFILE
```
- feels natural? ✓ minimal input
- output shows inference:
```
├─ inferred: --vault aws.config
```
- clear? ✓ user sees what was inferred, can override if wrong

---

### journey 5: single org auto-select

**output when single org:**
```
├─ org (auto-selected): ehmpathy
```
- clear? ✓ user sees what was selected
- no unnecessary prompt ✓

---

### journey 6: gh cli fallback

**output when gh unavailable:**
```
├─ ⚠ gh cli not available
│  └─ fall back to manual json input
│
├─ paste github app json:
│  └─ {"appId": "...", "privateKey": "...", "installationId": "..."}
```
- awkward? yes — user must construct json
- acceptable? yes — edge case fallback
- could improve?
  - could prompt for each field individually: appId, installationId, privateKey
  - **issue found**: per-field prompts would be less error-prone than raw json

---

## issue found

**gh cli fallback could be less awkward**

current: user pastes raw json
better: prompt for each field individually when gh cli unavailable

```
├─ ⚠ gh cli not available
│  └─ manual input required
│
├─ appId?
│  └─ 3234162 ✓
│
├─ installationId?
│  └─ 120377098 ✓
│
├─ private key path?
│  └─ ./beaver.pem ✓
```

this is more guided, same info, less error-prone.

**fix applied:** updated journey 6 in 3.2.distill.repros.experience._.v1.i1.md:
- changed step table to show t0-t4 with per-field prompts
- changed snapshot target output to use per-field prompts (appId, installationId, pem path)
- changed experience table: "fallback to manual json" → "fallback to per-field prompts"
- changed ergonomics table: "awkward — must paste json" → "natural — per-field prompts"

---

## verdict

one issue found and fixed:
- gh cli fallback now uses per-field prompts instead of raw json

all input/output pairs are now natural and clear.
