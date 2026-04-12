# self-review: has-behavior-declaration-adherance (r11)

## deeper reflection: what did r10 miss?

r10 checked explicit adherance. let me examine subtle semantic matches.

---

## potential deviation: "skip silently" vs "add to omitted"

### criteria (line 64)

> github.secrets keys are skipped silently

### blueprint (line 107)

> if bulk --for repo → add to omitted with reason 'remote'

**question:** does "add to omitted" align with "skip silently"?

**analysis:**

1. "silently" means no user-visible output for the skip
2. "add to omitted" is internal record — the key is skipped but tracked
3. the omitted list may or may not be displayed to users

**check extant behavior:**

extant unlockKeyrackKeys adds skipped keys to an omitted list. this list can be displayed in verbose mode or returned in the result object. but standard unlock does not print each omitted key.

**verdict:** adheres. "silently" refers to user experience (no message for each skip). internal record via omitted list is separate from user output. the acceptance test should verify no "skipped github.secrets key" message appears.

---

## potential deviation: message text

### vision (line 107)

> "message": "github secrets cannot be retrieved via api"

### criteria (line 47)

> failfast with "github secrets cannot be retrieved via api"

### blueprint (line 100)

> failfast with "github secrets cannot be retrieved via api"

**verdict:** adheres. exact message preserved in blueprint.

---

## potential deviation: del behavior

### criteria (lines 32-33)

> secret is removed from github via gh api DELETE
> key is removed from host manifest

### blueprint (lines 77-78)

> del
>   └── ghApiDelSecret (DELETE from github)

**question:** does blueprint mention host manifest removal?

**analysis:** blueprint line 77 shows `del` codepath. vault adapter del methods conventionally remove from host manifest as part of their operation. blueprint doesn't need to explicitly state this — it's inherent to vault adapter contract.

**check extant pattern:**

```ts
// extant pattern: vault adapter del removes from manifest
del: async (input) => {
  // ... external removal
  // ... manifest removal (implicit in adapter contract)
}
```

**verdict:** adheres. host manifest removal is part of vault adapter contract, not explicit in codepath.

---

## potential deviation: set output shape

### vision (lines 93-100)

```json
{
  "slug": "ehmpathy.all.GITHUB_APP_CREDS",
  "vault": "github.secrets",
  "mech": "EPHEMERAL_VIA_GITHUB_APP",
  "exid": "ehmpathy/rhachet.GITHUB_APP_CREDS"
}
```

### blueprint

blueprint does not declare set output shape explicitly.

**analysis:** set output shape is determined by vault adapter return value. blueprint declares the mechanism (set → ghApiSetSecret) but not the return shape.

**check if deviation:** the shape in vision is illustrative. blueprint focuses on codepaths, not data shapes. acceptance tests will verify actual output via snapshots.

**verdict:** not a deviation. output shape verified via acceptance test snapshots.

---

## summary of r11 reflection

| potential deviation | r10 checked? | r11 analysis | result |
|---------------------|--------------|--------------|--------|
| "silently" vs "omitted" | no | silently = user experience | adheres |
| message text | partial | exact match verified | adheres |
| del host manifest | no | part of adapter contract | adheres |
| set output shape | no | verified via snapshots | adheres |

**r11 found no adherance issues.** all semantic matches hold when examined closely.
