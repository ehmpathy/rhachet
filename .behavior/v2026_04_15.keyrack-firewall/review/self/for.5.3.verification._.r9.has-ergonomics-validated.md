# self-review: has-ergonomics-validated (r9)

## question

> does the actual input/output match what felt right at repros?

## analysis

### the wish document's vision

from 0.wish.md:

> how can we make it as ergonomic as possible to pass in all the secrets from github.secrets into keyrack/firewall

the vision was:
1. pass ALL secrets via `toJSON(secrets)`
2. firewall filters to keys in keyrack.yml
3. downstream steps get env vars automatically

### what I implemented (initial)

initially I enumerated secrets manually:
```yaml
SECRETS_JSON: '{"OPENAI_API_KEY":"${{ secrets.openai-api-key }}",...}'
```

this was wrong — it defeated the purpose.

### what I fixed (after user feedback)

user caught my mistake. fixed to match the vision:

```yaml
# test.yml (caller)
secrets: inherit

# .test.yml (callee)
- name: keyrack firewall
  env:
    SECRETS_JSON: ${{ toJSON(secrets) }}
```

now:
- no secret enumeration needed
- add a key to keyrack.yml = firewall handles it
- remove a key from keyrack.yml = firewall ignores it

### ergonomics comparison

| aspect | vision | implementation |
|--------|--------|----------------|
| pass all secrets | `toJSON(secrets)` | `${{ toJSON(secrets) }}` ✓ |
| filter to keyrack.yml | firewall filters | firewall filters ✓ |
| no per-step env vars | $GITHUB_ENV | --into github.actions ✓ |
| single source of truth | keyrack.yml | keyrack.yml ✓ |

### the fix that was needed

I initially drifted from the vision by manual enumeration of secrets. user feedback corrected this. the design now matches the original ergonomic intent.

## why it holds (after fix)

1. `secrets: inherit` passes all secrets without enumeration
2. `toJSON(secrets)` gives them as JSON
3. firewall filters to keyrack.yml declarations
4. no per-step env blocks needed
5. matches the vision from wish document

## verdict

**holds (after fix)** — ergonomics match the vision after user feedback corrected the initial drift
