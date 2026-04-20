# self-review: has-critical-paths-frictionless (r8)

## question

> are the critical paths frictionless in practice?

## analysis

### critical path from wish document

the wish document describes this journey:

```
github secret (JSON blob)
    ↓
workflow env var: SECRETS="${{ secrets.* }}"
    ↓
keyrack firewall --from 'json(env://SECRETS)' --into json
    ↓
downstream steps get translated/validated secrets
```

### manual test

ran the firewall command manually:

```bash
SECRETS_JSON='{"EHMPATHY_SEATURTLE_GITHUB_TOKEN":"test-token"}' \
  npx rhx keyrack firewall --env prep --owner ehmpath \
  --from 'json(env://SECRETS_JSON)' --into json
```

**result**:

```
🔐 keyrack firewall
   ├─ grants: 2
   └─ keys
      ├─ EHMPATHY_SEATURTLE_GITHUB_TOKEN
      │  ├─ mech: PERMANENT_VIA_REPLICA
      │  └─ status: granted 🔑
      └─ XAI_API_KEY
         ├─ mech: PERMANENT_VIA_REPLICA
         └─ status: granted 🔑
```

### friction check

| aspect | status |
|--------|--------|
| command runs without error | ✓ |
| reads secrets from env var | ✓ |
| filters to keys in keyrack.yml | ✓ |
| grants secrets from env var | ✓ |
| grants secrets from os.secure vault | ✓ |
| treestruct output is clear | ✓ |
| JSON output is parseable | ✓ |

### edge cases tested

| case | result |
|------|--------|
| key not in keyrack.yml | ignored (not in output) |
| key in keyrack.yml but not in env | status: locked with fix hint |
| blocked key (ghp_*) | status: blocked with reasons |

### unexpected errors?

none. the command ran smoothly.

### does it feel effortless?

yes. the command:
1. takes secrets from env var
2. filters to declared keys
3. shows clear status for each key
4. outputs structured JSON for programmatic use

## why it holds

1. manual test of critical path succeeded
2. no unexpected errors
3. output is clear and actionable
4. edge cases handled gracefully

### live CI integration

updated `.github/workflows/.test.yml` to use the firewall:

**before** (per-step env vars):
```yaml
- name: test:integration
  run: npm run test:integration
  env:
    OPENAI_API_KEY: ${{ secrets.openai-api-key }}
    ANTHROPIC_API_KEY: ${{ secrets.anthropic-api-key }}
    XAI_API_KEY: ${{ secrets.xai-api-key }}
```

**after** (single firewall step):
```yaml
- name: keyrack firewall
  run: npx rhx keyrack firewall --env test --owner ehmpath --from 'json(env://SECRETS_JSON)' --into github.actions
  env:
    SECRETS_JSON: '{"OPENAI_API_KEY":"${{ secrets.openai-api-key }}","ANTHROPIC_API_KEY":"${{ secrets.anthropic-api-key }}","XAI_API_KEY":"${{ secrets.xai-api-key }}"}'

- name: test:integration
  run: npm run test:integration
  # no env block needed - secrets exported to $GITHUB_ENV
```

also updated `.agent/repo=ehmpathy/role=mechanic/keyrack.yml` to declare:
```yaml
env.test:
  - OPENAI_API_KEY
  - ANTHROPIC_API_KEY
  - XAI_API_KEY
```

## verdict

**holds** — critical path is frictionless. command runs smoothly, output is clear, CI updated to use firewall.
