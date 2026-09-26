# define.claude-md-vs-system-prompt

> **`CLAUDE.md` is a USER message delivered after the system prompt. `--append-system-prompt` is
> the top-level `system` field. the adherence gap is real, documented, and Anthropic's own
> magnitude word is "marginally."**

retrieved 2026-09-23 from `code.claude.com/docs/en/*`, `platform.claude.com/docs/en/*`, and
`anthropic.com/constitution`. every claim below carries its class: **fact** (quoted), **inference**
(labelled), or **unknown** (named).

## 🔴 .the three-tier ladder — Anthropic's own escalation, in their order

| tier | channel | what Anthropic says it gives you |
|---|---|---|
| 1 | `CLAUDE.md` | *"there's no guarantee of strict compliance"* · *"context, not enforced configuration"* · *"not a hard enforcement layer"* |
| 2 | `--append-system-prompt[-file]` | *"For instructions you want at the system prompt level"* — more authoritative, **not** a guarantee |
| 3 | hooks · `permissions.deny` | *"apply regardless of what Claude decides to do"* — **the only actual guarantee** |

⇒ 🔴 **tier 2 is not compliance.** anyone who claims a move from tier 1 to tier 2 converts guidance
into obedience has gone past every source. **if it MUST happen, it is a hook.**

## ✅ .the two mechanisms that are documented FACT

**1 — architectural.** the `system` parameter is a distinct top-level request field:

> *"there is no `"system"` role for input messages in the Messages API."* — `/docs/en/api/messages`

so `CLAUDE.md` **cannot** occupy that field. the SDK *"injects its content into the conversation,
**not the system prompt**"*, restated four times on one docs page. confirmed independently by cache
behavior: *"CLAUDE.md content doesn't affect the system prompt cache."*

**2 — positional.**

> *"CLAUDE.md content is delivered as a user message **after the system prompt**, not as part of the
> system prompt itself."* — `/docs/en/memory`

## ⚠️ .the adherence claim — quoted exactly, because the qualifiers matter

the one authoritative statement that compares **identical text in two channels**:

> *"Instructions in the user message carry **marginally less weight** than the same text in the
> system prompt, so Claude **may** rely on them less strongly … Enable this option when
> cross-session cache reuse matters more than **maximally authoritative** environment context."*
> — `/docs/en/agent-sdk/modifying-system-prompts`

🔴 **"marginally" and "may" are Anthropic's words, not a hedge added here.** the gap is directional
and modest. `CLAUDE.md` remains first-class project context — it is not a demoted channel.

## 🔴 .the train-time mechanism is NOT documented — do not assert it

| the claim | status |
|---|---|
| Claude is trained to weight `system` above `user` | 🔴 **NO SOURCE FOUND.** the effect is asserted; the cause is unpublished |
| Anthropic has a Wallace-equivalent train-method paper | 🔴 **NO SOURCE FOUND** |
| Anthropic trains **channel-conditioned** trust at all | ✅ yes — but the only documented instance is tool results |
| "marginally" has a number behind it | 🔴 **NO SOURCE FOUND.** no benchmark, no percentage, from anyone |

the tool-result quote is the nearest evidence, and it does **not** prove system > user:

> *"Claude is trained to treat instructions that appear inside tool results with appropriate
> skepticism."* — `/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks`

⚠️ **that same page groups `system` prompts and plain user `text` blocks TOGETHER** on the trusted
side, versus `tool_result` on the untrusted side. it establishes `(system, user) > tool_result` —
never `system > user`.

⚠️ **Wallace et al. 2024, *"The Instruction Hierarchy"* (arXiv 2404.13208), is an OPENAI paper on
GPT-3.5**, and its premise is that models *lacked* this hierarchy as of April 2024. **it says naught
about Claude.** to cite it as the mechanism here is extrapolation, not evidence.

the Constitution defines a **principal** hierarchy (Anthropic → operators → users) and calls the
system prompt the operator's *typical* channel — but says "typically", allows operators to "inject
text into the conversation", and states it "is not a strict hierarchy". ⇒ a proxy, never a
definition. **whether `CLAUDE.md` counts as operator- or user-principal: NO SOURCE FOUND.**

## 🔴 .the counter-tradeoffs — the system prompt is WORSE on two axes

a reader who learns only the adherence gap will reach for tier 2 in cases where it silently fails:

| axis | `CLAUDE.md` | `--append-system-prompt[-file]` |
|---|---|---|
| **`--resume` / `--continue`** | ✅ re-injected | 🔴 **the flags are IGNORED.** *"the system prompt from the original session is reused"* |
| **mid-session change** | ✅ re-read from disk after `/compact` | 🔴 **inert.** recorded at the first request; new text applies only after a compaction or in a new session |
| **interactive use** | ✅ natural | ⚠️ launch-time only — *"better suited to scripts and automation than interactive use"* |
| **cache** | conversation-layer; re-sent | ✅ recorded once per session (2.1.267) |
| **team-shared via git** | ✅ checked in | ⚠️ generated |

⇒ 🔴 **the system prompt is a SNAPSHOT and `CLAUDE.md` is a LIVE READ.** a rule that must change
mid-route belongs in the conversation layer, full stop — and the resume row is the trap, because a
stale corpus on a resumed session fails **silently**.

## ⚠️ .the lever Anthropic documents most forcefully is BREVITY, not channel

stated at least as strongly as the channel effect, and easy to skip past:

> *"target under 200 lines per CLAUDE.md file. **Longer files consume more context and reduce
> adherence.**"* · *"**Shorter files produce better adherence.**"* · *"The more specific and concise
> your instructions, the more consistently Claude follows them."* — `/docs/en/memory`

🔴 **whether that length-adherence degradation also applies to a large SYSTEM PROMPT: NO SOURCE
FOUND.** every quoted instance is scoped to `CLAUDE.md`. ⇒ **an open question, and a live one for
any corpus in the hundreds of thousands of characters.** do not assume the channel move immunizes
a corpus against its own size.

⚠️ **brevity buys adherence, not perspective.** rhachet bets that a large boot shifts how the brain
thinks, and that shift is the value of a role. do not trim a role boot on the 200-line figure alone —
see `philosophy.minimal-budget-for-maximum-perspective`.

| when… | then… |
|---|---|
| an instruction **must** happen | 🔴 neither tier. a **hook** — the only documented guarantee |
| you would claim tier 2 gives compliance | 🔴 no source supports it. "marginally", "may" |
| the content changes **mid-session** | `CLAUDE.md` or the conversation layer. a system prompt is a snapshot |
| the session may be **resumed** | 🔴 system-prompt flags are **ignored**. the stale corpus is silent |
| you would cite Wallace et al. for Claude | ⚠️ OpenAI, GPT-3.5, and its premise is the opposite. say so or drop it |
| adherence is poor and the corpus is huge | ⚠️ check brevity first — it is the documented lever |
| you would say *"the model trusts system-role more"* | 🔴 **NO SOURCE.** say *"Anthropic states it carries marginally more weight"* |

## .see also

- `define.enrollment-identity-is-the-roleset-hash` — where a per-clone system-prompt corpus lands
- `.behavior/v2026_09_22.feat-boot-briefs-into-claude-md/1.vision.yield.md` — the transport matrix this grounds

## .sources

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/agent-sdk/modifying-system-prompts
- https://code.claude.com/docs/en/cli-reference
- https://code.claude.com/docs/en/context-window
- https://platform.claude.com/docs/en/api/messages
- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks
- https://www.anthropic.com/constitution
- https://arxiv.org/abs/2404.13208 — Wallace et al. 2024 (**OpenAI**, GPT-3.5)
