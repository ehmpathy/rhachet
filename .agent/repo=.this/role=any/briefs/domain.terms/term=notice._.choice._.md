# domain.term: notice

term.chosen   = notice
term.kind     = noun
term.synonyms.forbidden:
- warning
- alert
- caveat
- disclaimer
- advisory
- message

## .what

**a render that names work a SUCCESSFUL command could not carry.** the command did its job; the
notice states what it left behind, so a silence is never read as completeness.

a notice is the only one of keyrack's three render nouns that can be **absent**. when it leaves
none behind, it returns `null` and no byte reaches the stream.

## ⚠️ .the three render nouns are distinct — one word, one sense each

keyrack renders human-faced trees under three nouns. they are not synonyms, and the axis that
separates them is **what triggered the render**:

| noun | what triggers it | did the command succeed? | can it be absent? | shape |
|------|------------------|--------------------------|-------------------|-------|
| `report` | an **outcome** the command reached | either — it IS the outcome | ❌ always renders | tree |
| **`notice`** | an **omission** — work not carried | ✅ yes, fully | ✅ `null` when none | tree |
| `warn` | a **policy** the caller did not ask for | ✅ yes, one value altered | ✅ only when applied | one line |

the nullability is the tell. a `report` **is** the command's result, so it cannot be absent —
`getKeyrackBlockedReport` always returns a string, because a blocked command always has a cause to
render. a `notice` sits beside a result that already stands on its own, so its absence is the
normal case (e1).

## .why not `warning`

the `⚠️` glyph on the render invites it, and the word was the first reach. it is refused because
`warn` is already spent, on a different concept:

- `emitKeyrackDurationCapWarn` — **one line**, about **one value the command altered**
  behind the caller's back (a `maxDuration` cap shortened a requested ttl)
- `asKeyrackReachOmittedNotice` — **a tree**, about **work the command did not do at all**

to call both a "warn" would put one word on a value-was-changed fact and a work-was-omitted fact.
that is `rule.forbid.domain-term-synonyms` at a published surface.

## .where it renders

```
🔐 keyrack source
   └─ ⚠️ 2 reaches not sourced
      ├─ why: one shell variable name holds one value, so only the reachless key was emitted
      ├─ API_KEY @ beav@ehmpathy.com (locked)
      │  └─ rhx keyrack source --env test --key API_KEY --reach beav@ehmpathy.com
      └─ API_KEY @ vlad@ehmpathy.com (held)
         └─ rhx keyrack source --env test --key API_KEY --reach vlad@ehmpathy.com
```

every omitted row names the one-at-a-time fix that reaches it
(`rule.require.errors-name-the-fix`, applied to a success path).

## .refs
- `src/domain.operations/keyrack/cli/asKeyrackReachOmittedNotice.ts`  # the sole notice today
- `src/domain.operations/keyrack/cli/emitKeyrackDurationCapWarn.ts`  # the `warn` it is not
- `src/domain.operations/keyrack/getKeyrackBlockedReport.ts`  # the `report` it is not

## .reason
see the ref-level cluster beside this choice:
- `term=notice._.choice.reason.md` — etymology, the rejected synonyms, evidence, invariants
