# rule.require.short-serial-for-unslugged-clones

## .what

whenever a surface hands a human the address of a clone that has **no slug**, it renders the
**short serial** — the first uuid segment, 8 hex chars, via `asCloneSerialHuman` — never the
full 36-char uuid.

```
👍  rhx clone say @:7f3a1b2c --what "…"
👎  rhx clone say @:7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b --what "…"
```

a **named** clone is unaffected: `@:<slug>` always wins, because it is the address the human
chose and will retype (`define.address-sigils`).

## .why

### the short form is the address the rest of the surface already speaks

three parts of the clone domain agree, and any render that shows a full uuid is the one that
disagrees with all three:

| surface | what it shows / accepts |
|---|---|
| `clone list` | the 8-hex prefix (`asCloneSerialHuman`) |
| `getOneCloneByRef` | resolves **any** hex body of 4+ chars back to the clone, git-style |
| `asCloneSerialHuman`'s own docblock | *"one owner of the 'short serial' rule, so the list view and any future human render show the SAME prefix"* |

⇒ a full uuid in a human-faced line is **longer to read, longer to type, and no more
reachable.** it buys the human no reach at all and costs them 28 characters.

### the abbreviation is safe BY CONSTRUCTION, never by luck

this is the part worth the record, because *"a prefix might collide"* is the objection that
would otherwise get re-litigated every time:

`getOneCloneBySerialPrefix` de-hyphenates every clone's serial, prefix-matches, and:

- **0 matches** → null → the caller's unknown-address refusal
- **1 match** → the clone
- **2+ matches** → 🔴 throws a `ConstraintError` that names **every candidate** and says *"use a
  longer serial prefix"*

so the worst case is a **loud refusal with the fix named**, never a silent wrong-clone. that is
what makes the ergonomic win free rather than a gamble — the safety is a property of the
resolver, not of the odds.

⚠️ **and the odds are not the argument, though they are on our side.** 8 hex chars is 2^32, the
scope is one repo's live clones, and the wisher's read (2026-09-06) is that a collision on the
first segment alone is *"pretty much 0"*. that is true and it is the **weaker** half of the case
— an argument from probability would have to be re-made every time someone got nervous. the
resolver's loud-refusal branch is the half that settles it permanently.

## .the test

> **"is this a human-faced render of a clone with no slug?"**

- yes → `asCloneSerialHuman({ serial })`
- it is a **machine** channel (`--output json`, the `.serials/` index, an on-disk dir name) →
  🔴 the **full** serial. the human form is lossy and display-only
- the clone **has** a slug → the slug, always

## 🚨 .where it applies — through ONE owner, `asCloneAddressHuman`

every human-faced render of a clone's address calls `asCloneAddressHuman({ slug, serial })`. it
returns the whole address, `@:` sigil included, so no call site composes one by hand.

| render | what it shows |
|---|---|
| `clone list` | `@:<slug>` or `@:<8hex>`, plus a `serial=<8hex>` field for a named clone |
| `clone prune` | the same pair, per prunable row |
| `clone whoami` | the address AND its `serial=` field |
| `clone say` | the `😶🎙️ said to @:…` header |
| `clone get` | the `😶🎧 talk of @:…` header |
| `asCloneReachBreadcrumb` | **both** reach branches, which carry the SAME address |

⚠️ **the sigil is inside the transformer deliberately.** `@:` marks the CLONE grain where a bare
`@` marks an ACTOR (`define.address-sigils`), so a call site that re-adds its own prefix is one
that can emit the wrong grain — or a doubled `@:@:`. the transformer's own unit test bounds both.

### 🚨 .why ONE owner rather than a convention each render follows

a projection with no owner is a rule every call site must **remember**, and the failure is silent:
each render reads correct on its own, and only a diff of two of them shows the drift.

⚠️ the sharp form of that, measured here: `asClonePruneView`'s docblock claimed it rendered *"the
same address form `list` renders"* — and it rendered the full uuid while `list` rendered 8 hex. **a
comment that claims agreement with a neighbour is a claim no compiler checks**, and it was false for
as long as it stood. the repair is not a truer comment; it is a shared owner, so the claim is held
by code.

⇒ a **new** render is therefore not a new place to apply the rule. it is a new caller of the owner.

## .the machine boundary — do NOT abbreviate across it

`asCloneSerialHuman` is the twin of `IsoPriceHuman`: **a lossy projection for READS.** the full
serial stays canonical everywhere identity matters.

| channel | form |
|---|---|
| a line a human reads | short — 8 hex |
| `--output json` | **full** uuid |
| the `.serials/` index, the on-disk dir | **full** uuid |
| an error's `metadata` | **full** uuid — a machine or a maintainer reads it |

⇒ a short serial written into a machine channel is a defect, not a courtesy: it makes the
payload ambiguous where the whole point of a machine channel is that it is not.

## .examples

### 👎 bad — the human is handed a uuid to type

```ts
console.error(`🔌 reachable at: rhx clone say @:${serial} --what "…"`);
```

### 👍 good — the whole address, from its one owner

```ts
const address = asCloneAddressHuman(clone); // '@:driver' | '@:7f3a1b2c'
console.error(`🔌 reachable at: rhx clone say ${address} --what "…"`);
```

⚠️ **never re-compose it at the call site**, even correctly. a `slug ?? asCloneSerialHuman(...)` in
an orchestrator is decode-friction, and it moves a real guarantee into a line no unit test reads
(`rule.forbid.decode-friction-in-orchestrators`). `asCloneSerialHuman` stays public for the
**`serial=` field**, which is a different render than the address.

## .enforcement

- a full uuid serial in a human-faced clone address = **blocker**
- a clone address composed at a call site (`slug ? … : …`, or a `@:` prefix added by hand) rather
  than taken from `asCloneAddressHuman` = **blocker** — a second owner is how two renders drift
- a hand-rolled abbreviation (`.slice(0, 8)`, `.split('-')[0]`) rather than
  `asCloneSerialHuman` = **blocker**
- a **short** serial in a machine channel (json, index, dir name, error metadata) = **blocker**

## .see also

- `asCloneAddressHuman` — the one owner of the whole address, sigil included
- `asCloneSerialHuman` — the one owner of the serial projection it composes
- `getOneCloneByRef` / `getOneCloneBySerialPrefix` — the resolver that makes it reachable, and
  the loud-refusal branch that makes it safe
- `define.address-sigils` — `@:` marks the clone grain; slug is the unique ref, serial the primary
- `rule.forbid.decode-friction-in-orchestrators` — why the projection lives in the transformer
