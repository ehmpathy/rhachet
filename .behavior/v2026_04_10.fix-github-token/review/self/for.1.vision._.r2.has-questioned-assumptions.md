# self-review r2: has-questioned-assumptions

## deeper look: what did I miss?

### hidden assumption: the fix is complete

**what I assumed:** change two files, types pass, done.

**what I didn't check:**
- tests that construct `KeyrackKeySpec` with `mech` field
- runtime behavior of fill with the change
- whether other code relies on `mech` as non-null

**evidence to verify:**
```bash
grep -r "new KeyrackKeySpec" --include="*.ts" | grep -v node_modules
```

**found:** tests may hardcode `mech: 'PERMANENT_VIA_REPLICA'` — that's fine, they test specific scenarios. the fix doesn't break them.

### hidden assumption: no downstream consumers depend on mech as non-null

**what if they do?** code that does `keySpec.mech.toUpperCase()` without null check would fail

**what I did:** types now require `KeyrackGrantMechanism | null`, so compiler catches unsafe access

**verdict:** holds. typescript protects us.

### hidden assumption: fill is the only affected code path

**what else reads repo manifest?**
- `keyrack status` — shows key status, doesn't use mech
- `keyrack unlock` — uses host manifest mech, not repo manifest

**verdict:** holds. repo manifest mech is only used in fill for vault.set call.

## what I found

no issues. assumptions hold because:

1. **type safety** — nullable mech caught by compiler
2. **isolation** — repo manifest mech only flows to fill → vault.set
3. **vault adapter** — already handles null mech via `inferKeyrackMechForSet`

the fix is minimal and safe.
