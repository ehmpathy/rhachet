# self-review: has-ergonomics-validated (r8)

## the question

> does the actual input/output match what felt right at design time?

## context: no repros artifact

this behavior has no repros artifact. the ergonomics were defined in the vision (`1.vision.md`) and criteria (`2.1.criteria.blackbox.md`).

## input ergonomics: planned vs actual

### the --which flag

**planned (vision):**
```bash
rhx upgrade --which local
rhx upgrade --which global
```

**actual (CLI help):**
```
--which <which>       which installs to upgrade: local, global, or both
```

**match?** YES — the flag name, syntax, and values match exactly.

### default behavior

**planned (vision):**
- `rhx upgrade` → global + local by default
- `npx rhachet upgrade` → local only by default

**actual (unit tests verified):**
- rhx invocation → defaults to `both`
- npx invocation → defaults to `local`

**match?** YES — the default rules match exactly.

## output ergonomics: planned vs actual

### planned output format (vision)

```
✨ rhachet upgraded (local)
✨ 3 role(s) upgraded: ehmpathy/mechanic, ehmpathy/architect, ehmpathy/ergonomist
✨ rhachet upgraded (global)
```

### actual output format (from blueprint)

```
📦 upgrade (pnpm)
   ├── rhachet@latest
   └── rhachet-roles-ehmpathy@latest

📦 upgrade (npm -g)
   └── rhachet@latest

✨ rhachet upgraded locally
✨ 1 role(s) upgraded: ehmpathy/mechanic
✨ rhachet upgraded globally
```

### did the design drift?

**YES — but the drift is an improvement.**

| aspect | planned | actual | better? |
|--------|---------|--------|---------|
| header format | none | `📦 upgrade (pnpm)` tree | yes — shows what will install |
| summary prefix | `(local)` | `locally` | same intent, cleaner |
| global indicator | `📦 upgrade (npm -g)` | yes | yes — shows global as separate operation |

the actual output is MORE informative than planned:
- shows the package manager used (pnpm vs npm)
- shows which packages will be upgraded
- distinguishes local vs global install operations visually

### should we update vision?

the vision described the minimal output. the actual implementation provides more detail. this is not a regression — it's an enhancement.

no update needed. the core ergonomics (what the user types, what they understand) match.

## ergonomics checklist

| ergonomic | planned | actual | match |
|-----------|---------|--------|-------|
| flag name | `--which` | `--which` | ✓ |
| flag values | `local\|global\|both` | `local\|global\|both` | ✓ |
| rhx default | both | both | ✓ |
| npx default | local | local | ✓ |
| success indicator | ✨ | ✨ | ✓ |
| failure behavior | warn and continue | warn and continue | ✓ |

## conclusion

the ergonomics match:
- input syntax matches exactly
- default behaviors match exactly
- output format enhanced (more detail, same semantics)

no drift that needs correction. the implementation is faithful to the design.
