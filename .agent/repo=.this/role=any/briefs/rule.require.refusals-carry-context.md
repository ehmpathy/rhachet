# rule.require.refusals-carry-context

## .what

a refusal a human reads must hold THREE things, always:

1. **the message** — what went wrong, and the fix
2. **the metadata** — the values that caused it, EVERY field, never an allowlisted subset
3. **the invocation** — the command the human actually ran

a pretty render that drops (2) or (3) is a REGRESSION against a raw dump that kept them.

## .why

the shape this rule enshrines is the one a raw `helpful-errors` dump already had:

```
✋ ConstraintError: host manifest not found. run: rhx keyrack init --owner mechanic

{
  "owner": "mechanic"
}

[args] keyrack,set,--key,TEST,--vault,aws.params,--mech,PERMANENT_VIA_REFERENCE,--owner,mechanic,--env,test,--org,ehmpathy
```

it is ugly — it leaks a class name, and the args are comma-joined rather than shell-shaped. so it
was replaced with a tree. **the tree was prettier and told the human less**, because the renderer
allowlisted five metadata keys and dropped the rest, and echoed no invocation at all. the human
lost the `owner` that was at fault and the command they typed.

that is the trap this rule exists to close: **a render is not an improvement if it is lossy.**
legibility is what you add ON TOP of the facts, never INSTEAD of them.

- the **metadata** is the diagnosis. "invalid --mech: must be one of …" names the valid set and
  never the value at fault, so a human with a typo cannot see their typo
- the **invocation** is the reproduction. a human reads an error minutes after they typed the
  command, often from a scrollback or a CI log where the command is far above — and an agent
  reads it with no scrollback at all

## .the rule

| the piece | who owes it | the failure it prevents |
|-----------|-------------|-------------------------|
| the message + fix | the throw site | a symptom with no way forward |
| the metadata | the throw site — EVERY refusal holds the values at fault | an error that cannot be diagnosed |
| every field rendered | the renderer — no allowlist | a throw site that supplies context the render silently eats |
| the invocation | the renderer | an error that cannot be reproduced |

### the throw site owes metadata

a refusal that names a rejected value must SUPPLY that value:

```ts
// 👎 bad — names the valid set, never the value at fault
throw new ConstraintError(`invalid --mech: must be one of ${validMechs.join(', ')}`);

// 👍 good — the value at fault is in the metadata, so the render can show it
throw new ConstraintError(`invalid --mech: '${opts.mech}'`, {
  mechGiven: opts.mech,
  mechsValid: validMechs.join(', '),
  hint: `pass one of: ${validMechs.join(', ')}`,
});
```

### the renderer owes every field

an allowlist in a renderer is a **failhide**: the throw site looks correct, the field is real, and
only the render loses it — so nobody learns the context was dropped.

```ts
// 👎 bad — five keys survive, the rest are eaten with no trace
if (typeof metadata.slug === 'string') leaves.push(`repo: ${metadata.slug}`);
if (typeof metadata.hint === 'string') leaves.push(`hint: ${metadata.hint}`);

// 👍 good — known keys get a friendly label, and EVERY other field still renders
const labelled = new Set(['slug', 'stderr', 'note', 'hint', 'fix']);
for (const [key, value] of Object.entries(metadata))
  if (!labelled.has(key)) leaves.push(`${key}: ${asLeafValue(value)}`);
```

## .the caveat — a test must not lean on the echo

the invocation echo repeats every flag a human typed, so an assertion that greps the whole output
for a flag VALUE can match the echo rather than the message — and pass while the refusal it names
never fired.

this is not hypothetical: `keyrack.org-mismatch` `[case2][t0]` was green for exactly that reason —
`toContain('foreign-org')` matched the `[args]` trailer, while the run had refused for an entirely
different cause (ehmpathy/rhachet#467 review, r011).

⇒ assert on the **message**, never on a value that also appears in the echo. where a value is
genuinely in both, assert the sentence that holds it.

### the corollary — the echo can also hide a vacuous row

the echo differs per invocation, so two snapshots of the SAME refusal read as two distinct records
whenever the two runs typed different flags. that difference is cosmetic, and it masks rows that
never reached the refusal they name.

`keyrack.vault.awsParams` `[case1]` is the case: `[t0]` and `[t1]` differ only by `--mech`, both
refused at `host manifest not found` three guards above the mech check they exist to assert, and
both read green. the `[args]` trailer made their snapshots look distinct; strip it and they are
byte-identical — which is the tell.

⇒ **two renders that differ ONLY by the echo are two runs that never diverged.** read that as a
smell, never as a difference. and give any row that asserts on refusal N a positive clamp on N's
own words plus a `not.toContain` of N-1's — every `not.toContain` and every non-zero-exit
assertion is already satisfied by an earlier refusal.

## .enforcement

- a refusal render that drops a metadata field the throw site supplied = **blocker**
- a refusal that names a rejected value without that value in metadata = **blocker**
- a refusal render a human reads with no invocation echo = **blocker**
- a test that asserts a bare value which also appears in the invocation echo = **blocker**
  (it cannot distinguish the refusal it names from any other)
- a row that asserts on a refusal without a positive clamp on that refusal's own words =
  **blocker** (it reads green off any earlier guard)
- two snapshotted refusals that differ only by their echo = **blocker** (neither row reached its
  subject)

## .see also

- `rule.require.failloud` (mechanic) — the class + context obligation this sharpens
- `rule.require.errors-name-the-fix` (ergonomist) — the message half of the shape
- `rule.forbid.failhide` (mechanic) — an allowlist that eats fields is this, in a renderer
- `rule.require.treestruct-output` (ergonomist) — the shape the render takes once it is complete
