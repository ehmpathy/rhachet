# self-review r3: has-consistent-mechanisms

fresh eyes. slow review. question everything.

---

## the change

```diff
-    const { secret } = await mechAdapter.deliverForGet({ source });
-    return secret;
+    await mechAdapter.deliverForGet({ source });
+    return source;
```

---

## search for extant mechanisms

### search 1: how do other vault adapters use getMechAdapter + deliverForGet?

ran: `grep -n "deliverForGet" src/domain.operations/keyrack/adapters/vaults/**/*.ts`

**findings:**

| vault | code | returns |
|-------|------|---------|
| os.secure (line 156) | `const { secret } = await mechAdapter.deliverForGet({ source }); return secret;` | `secret` |
| os.direct (line 177) | `const { secret } = await mechAdapter.deliverForGet({ source }); return secret;` | `secret` |
| 1password (line 285) | `const { secret } = await mechAdapter.deliverForGet({ source }); return secret;` | `secret` |
| aws.config (fixed) | `await mechAdapter.deliverForGet({ source }); return source;` | `source` |

**observation**: our fix diverges from the pattern in other vault adapters. they return `secret`, we return `source`.

### question: is this a consistency violation?

**no.** the aws.config vault has fundamentally different semantics:

| vault | what is `source`? | what is `secret`? | what should get() return? |
|-------|-------------------|-------------------|---------------------------|
| os.secure | encrypted pem content | ghs_ token | `secret` (transformed credential) |
| os.direct | plaintext credential | same | `secret` (identity transform) |
| 1password | op:// reference | fetched value | `secret` (resolved reference) |
| aws.config | profile name ("ehmpathy.demo") | credentials JSON | `source` (profile name!) |

the bug was treating aws.config like other vaults. but:
- AWS_PROFILE env var expects a profile name
- AWS SDK resolves credentials from the profile name
- returning credentials JSON was never correct

the fix recognizes that aws.config vault semantics differ from secret-storing vaults.

### search 2: is there another mechanism for "validate then return original"?

searched for:
- `validateSso` — not found
- `checkSsoSession` — not found
- patterns of await-but-discard-result — not found in vault adapters

**conclusion**: no extant mechanism for this. but we don't need one — the fix is 2 lines, not worth abstracting.

### search 3: do we duplicate any utilities?

the change:
- removes a variable declaration (`const { secret }`)
- changes a return value

it does not add:
- new functions
- new types
- new utilities
- new patterns

**conclusion**: no duplication possible — the change removes code, does not add.

---

## extant mechanisms reused

| mechanism | location | reused? |
|-----------|----------|---------|
| `getMechAdapter()` | line 21 | yes — still called |
| `mechAdapter.deliverForGet()` | mech adapter | yes — still called for validation |
| `source` variable | line 172 | yes — now returned |

all extant mechanisms are preserved and reused.

---

## why it holds

**no new mechanisms introduced. deliberate divergence from pattern.**

1. **not a consistency violation** — the divergence from other vaults is intentional. aws.config vault has different semantics: it stores profile names, not secrets. the "source" IS the value we want.

2. **mech.deliverForGet still serves its purpose** — for aws.config, calling deliverForGet validates the SSO session is active (triggers browser login if expired). the side effect is the value; the return is discarded.

3. **extant mechanisms preserved** — we still call `getMechAdapter()` and `mechAdapter.deliverForGet()`. the orchestration flow is unchanged.

4. **no new abstractions** — the fix is 2 lines of code. creating a new utility for "validate session and return source" would be YAGNI.

the divergence is architectural recognition that aws.config vault is fundamentally different from secret-storing vaults.

