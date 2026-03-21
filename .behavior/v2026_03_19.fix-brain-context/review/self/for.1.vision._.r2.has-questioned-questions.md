# self-review r2: has-questioned-questions

triage all open questions in the vision.

---

## questions to validate with wisher

### 1. should context flow through actor.ask/actor.act automatically?

**triage**: [wisher]

this is a design decision about how actors compose with brains. the wisher must decide:
- automatic flow = less boilerplate for callers
- explicit flow = more control, clearer data flow

cannot answer via logic — depends on wisher's intent for the actor abstraction.

### 2. should we support multiple supplier contexts (e.g., brain that uses both xai and anthropic)?

**triage**: [answered]

yes, via intersection types. the vision already notes this works:

```ts
ContextBrainSupplier<'xai', XaiSupplies> & ContextBrainSupplier<'anthropic', AnthropicSupplies>
```

this is not a question — it's a capability that already follows from the type design.

**action**: move from "questions" to "assumptions" and note intersection types work.

### 3. is the `brain.supplier.<slug>` namespace pattern acceptable?

**triage**: [wisher]

the namespace is specified in the wish:
```ts
// expands to: { 'brain.supplier.xai': BrainSuppliesXai }
```

the wisher explicitly requested this pattern. not a question — it's a requirement.

**action**: remove from questions. the wisher already specified it.

---

## external research needed

### 1. how do other brain sdks handle credential injection?

**triage**: [research]

valid research item. useful to confirm we're aligned with industry patterns.

keep for research phase.

### 2. any prior art for typed context generics in similar domains?

**triage**: [research]

valid research item. useful for validation.

keep for research phase.

---

## summary of question triage

| question | triage | action |
|----------|--------|--------|
| context flow through actor | [wisher] | keep as wisher question |
| multiple supplier contexts | [answered] | move to assumptions |
| namespace pattern | [answered] | remove — wisher specified |
| other sdk patterns | [research] | keep for research |
| prior art for typed context | [research] | keep for research |

---

## fix applied

updated `.behavior/v2026_03_19.fix-brain-context/1.vision.md`:

**changes made:**

1. removed question #3 (namespace pattern) — wisher already specified it
2. updated question #2 to note it's supported via intersection types
3. kept question #1 as [wisher] — requires wisher input
4. kept both research items for research phase

the vision's open questions are now properly triaged.
