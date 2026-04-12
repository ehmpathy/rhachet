# self-review: has-questioned-assumptions (r4)

## deeper reflection: what assumptions have i not yet questioned?

r3 covered 7 assumptions. let me look for more hidden ones.

---

### assumption 8: the host manifest can store github.secrets entries

**the assumption:** the host manifest structure can accommodate a new vault type.

**evidence check:** per research pattern.1, KeyrackHostVault is a union type. add 'github.secrets' to the union. the manifest already stores vault entries with arbitrary vault values.

**what if the manifest structure doesn't support this?**
if the manifest had a fixed schema, we'd need migration. but it's a union type — new values just extend the union.

**verdict:** the manifest is extensible by design. no hidden assumption.

---

### assumption 9: secret names are valid for github

**the assumption:** key names from keyrack translate directly to github secret names.

**what if github has name restrictions?**
github secret names must:
- contain only alphanumeric characters or underscores
- not start with a number
- not be `GITHUB_*` (reserved)

**is this validated in the blueprint?**
the blueprint does not include name validation.

**issue found:** the blueprint should validate secret names before api call.

**resolution:** add name validation to ghApiSetSecret. failfast with "invalid secret name: must be alphanumeric/underscore, cannot start with number, cannot be GITHUB_*".

**update needed:** blueprint should include this in ghApiSetSecret codepath.

---

### assumption 10: the mech value fits in github secret size limit

**the assumption:** the json blob from EPHEMERAL_VIA_GITHUB_APP is within github's secret size limit.

**what is github's limit?**
github secrets have a 48KB size limit per secret.

**is a github app json blob under 48KB?**
- appId: ~10 bytes
- installationId: ~10 bytes
- privateKey: pem file, typically 1-4KB

total: well under 48KB.

**verdict:** the assumption holds. github app credentials are small.

---

### assumption 11: gh api returns structured errors

**the assumption:** when gh api fails, it returns parseable error messages.

**what if the error format is inconsistent?**
gh cli standardizes error output. 404 returns "not found", 403 returns "forbidden".

**is this tested?**
the blueprint includes mock gh cli responses for 404 and 403 cases.

**verdict:** the assumption is tested via mocks.

---

### assumption 12: the daemon skips github.secrets correctly

**the assumption:** the daemon knows to skip github.secrets keys without error.

**how does the daemon handle this?**
per blueprint: unlockKeyrackKeys checks `adapter.get === null`. if null:
- specific key → failfast
- bulk unlock → add to omitted with reason 'remote'

**what about daemon status?**
the daemon shows status based on what was unlocked. for github.secrets keys, they appear as `locked` because they were never unlocked into daemon.

**verdict:** the logic is correct. daemon correctly reports locked status.

---

## issue found: secret name validation

the blueprint assumes key names are valid github secret names. this is not validated.

**fix:** add validation to ghApiSetSecret:

```
ghApiSetSecret
├── [+] validateSecretName
│   ├── must match /^[A-Z][A-Z0-9_]*$/
│   ├── cannot start with GITHUB_
│   └── failfast if invalid
├── [+] validateGhAuth
├── [+] formatRequestBody (encrypted_value, key_id)
└── [+] invokeGhApi (gh api -X PUT)
```

**fix applied:** blueprint updated at line 79 to include validateSecretName in ghApiSetSecret codepath:

```
ghApiSetSecret
├── [+] validateSecretName (alphanumeric/underscore, no GITHUB_ prefix)
├── [+] validateGhAuth
├── [+] formatRequestBody (encrypted_value, key_id)
└── [+] invokeGhApi (gh api -X PUT)
```

---

## summary

| assumption | validated? | action |
|------------|------------|--------|
| host manifest extensible | yes | union type design |
| secret names valid | **fixed** | **validation added to blueprint** |
| mech value under 48KB | yes | pem is small |
| gh api error format | yes | tested via mocks |
| daemon skips correctly | yes | logic is sound |

**one issue found and fixed:** secret name validation was absent. blueprint updated with validateSecretName.

