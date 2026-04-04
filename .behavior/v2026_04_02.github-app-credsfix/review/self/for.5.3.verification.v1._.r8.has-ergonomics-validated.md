# review: has-ergonomics-validated (r8)

## verdict: pass — ergonomics match plan exactly

## question: does the actual input/output match what felt right at repros?

### step 1: extract planned ergonomics from wish

the wish (`0.wish.md`) shows the planned input:

```bash
jq -n --rawfile key ~/Downloads/my.private-key.pem \
    '{appId: "3234162", privateKey: $key, installationId: "120377098"}' | \
  npx rhachet keyrack set \
    --key EHMPATH_BEAVER_GITHUB_TOKEN \
    --env prep \
    --vault os.secure \
    --owner ehmpath \
    --mech EPHEMERAL_VIA_GITHUB_APP
```

the vision (`1.vision.md`) shows the planned output:

```bash
# after fix:
🔐 keyrack set (org: ehmpathy, env: prep)
   └─ ehmpathy.prep.MY_GITHUB_TOKEN ✓

# get returns exactly what was set:
rhx keyrack get --key MY_GITHUB_TOKEN --env prep --allow-dangerous --json
{
  "grant": {
    "key": {
      "secret": "{\"appId\":\"123\",\"privateKey\":\"-----BEGIN RSA...\\n...\\n-----END RSA-----\\n\",\"installationId\":\"456\"}"
    }
  }
}
```

### step 2: compare to implemented behavior

**planned input:**
- pipe multiline JSON to stdin
- use standard keyrack set flags

**implemented input:**
- exact same — no change to CLI flags or input method

**planned output:**
- set: success message with key slug
- get: JSON with `grant.key.secret` that holds exact input

**implemented output:**
- set: success message with key slug (verified via `setResult.status === 0`)
- get: JSON with exact input (verified via `parsed.grant.key.secret === multilineJson`)

### step 3: check for ergonomic drift

| aspect | planned | implemented | drift? |
|--------|---------|-------------|--------|
| input format | pipe JSON via stdin | pipe JSON via stdin | no |
| CLI flags | `--key`, `--env`, `--vault`, `--mech` | unchanged | no |
| success output | tree-struct message | tree-struct message | no |
| get output | JSON with secret field | JSON with secret field | no |
| round-trip fidelity | exact match | exact match | no |

**conclusion:** zero ergonomic drift

### step 4: validate user mental model

the vision states:

> stdin → keyrack should be like `cat > file` — bytes in, same bytes out

**is this true after the fix?**

yes. the async iterator reads all stdin bytes until EOF, then stores them. the `keyrack get` returns exactly what was stored.

### step 5: verify no new requirements emerged

| requirement | source | status |
|-------------|--------|--------|
| multiline JSON support | wish | implemented |
| single-line JSON support | criteria | regression tested |
| empty stdin | criteria | handled (returns empty string) |
| large content | criteria | supported (no size limit in code) |
| special characters | criteria | preserved (bytes in, bytes out) |

no new requirements emerged. all planned behaviors are implemented.

### why this holds

1. **input unchanged** — same CLI flags, same pipe semantics
2. **output unchanged** — same JSON structure, same tree-struct messages
3. **fix is invisible** — users don't see the fix, just correct behavior
4. **mental model holds** — "bytes in, bytes out" is now true

### conclusion

the ergonomics match the plan exactly. the fix is an internal correction that makes the planned behavior work. no drift occurred because the contract (input/output format) was correct in the plan — only the implementation was broken.

