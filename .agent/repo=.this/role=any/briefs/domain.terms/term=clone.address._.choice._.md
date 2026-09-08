# domain.term: clone.address

term.chosen   = address
term.kind     = noun
term.boundary = clone          # the subdomain the word holds its sense within — REQUIRED
term.status   = DECLARED
term.synonyms.forbidden:
- handle
- locator
- identifier
- id
- slug (for the WHOLE form — a slug is one BODY an address may carry)
- serial (same — a serial is a body, never the address)

## .what

**the whole string a human types to reach one clone, `@:` sigil included.**

```
@:driver        ← a NAMED clone: the sigil, then its slug
@:7f3a1b2c      ← a BARE clone: the sigil, then its short serial (8 hex)
```

the sigil is **part of the value**, not decoration around it. `@:` marks the CLONE grain where a
bare `@` marks an ACTOR (`define.address-sigils`), so a string with the sigil stripped is not a
shorter address — it is a value whose grain is unstated.

## ⚠️ address vs slug vs serial — one noun over two bodies

| | `slug` | `serial` | `address` |
|---|--------|----------|-----------|
| what it is | the clone's **unique** ref, from `--as` | the clone's **primary** ref, a uuid minted at spawn | the reachable **whole**, sigil + one body |
| always present? | ❌ only when named | ✅ always | ✅ always |
| carries the sigil? | ❌ | ❌ | ✅ |
| human render | as-is | **8 hex** (`asCloneSerialHuman`) | `@:<slug>`, else `@:<8hex>` |
| machine render | as-is | **full 36-char uuid** | — machine channels emit the bodies, never the address |

⇒ **a machine payload emits `slug` and `serial` as separate fields; it never emits an address.**
the address is a HUMAN form — it is lossy (the serial body is abbreviated) and it fuses two
fields into one string. the keyrack boundary settled the same question the same way, for the same
reason (`term=address`, `## ⚠️ the split bites hardest on a PUBLISHED contract`).

## .the one owner

every human-faced render calls **`asCloneAddressHuman({ slug, serial })`**. no call site composes
one, and no call site adds the sigil.

## .refs

the owner:
- `src/domain.operations/clone/asCloneAddressHuman.ts`

its callers — the complete set at declaration:
- `src/domain.operations/clone/asCloneReachBreadcrumb.ts`
- `src/domain.operations/clone/cli/asCloneListView.ts`
- `src/domain.operations/clone/cli/asClonePruneView.ts`
- `src/contract/cli/invokeCloneSay.ts`
- `src/contract/cli/invokeCloneGet.ts`
- `src/contract/cli/invokeCloneWhoami.ts`

⚠️ **a caller list decays faster than the term.** re-derive with a grep for `asCloneAddressHuman`
rather than trust this figure — the same discipline `term=address` records for its own cited paths.

the sigil scheme, and the argument for it:
- `.agent/repo=.this/role=any/briefs/define.address-sigils.md`

the short-serial body's rule:
- `.agent/repo=.this/role=any/briefs/rule.require.short-serial-for-unslugged-clones.md`

## .reason

see the ref-level cluster beside this choice:
- `term=clone.address._.choice.reason.md` — etymology, the boundary split from `term=address`,
  the disputes, the evidence
