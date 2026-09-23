# domain.term.choice.reason: transcript

## .etymology
why `transcript`: a transcript is a verbatim written record of what was said, turn by turn — the
precise sense of the brain-cli's `<exid>.jsonl` session file, one line per user/assistant turn.
adopted from claude-code's own vocabulary (it names these files its session transcripts).

chosen over the forbidden synonyms:
- `log`     — too generic; a log is any append stream. a transcript is specifically the turn record.
- `history` — RESERVED for the clone's `history/` DIR, which SYMLINKS to transcripts. the dir is the
              handle-collection; a transcript is the target. one word each keeps the layers distinct.
- `conversation` — the human-side label, not the on-disk artifact.
- `record`  — vague; overloaded with domain-object records elsewhere.

## .disputes

### dispute: story — raised 2026-09-21 — status: OPEN (contracts keep `transcript`)

- raised.by  = the wisher, as the `--what` default on `rhx clone get --what buffer|queue|story`
- claim      = `--what` names one of three READ SURFACES, and its three values should be one kind of
               word. `buffer` and `queue` each name a surface a reader looks at; `transcript` names a
               storage artifact. `story` keeps the set on one axis, and it is what a human asks for —
               *"show me the story"*, where *"show me the transcript"* asks for a file.
- counter    = `conversation` is ALREADY forbidden here, for the reason `story` inherits: it is the
               human-side label rather than the on-disk artifact. so `--what story` puts a synonym of
               a declared term into a published CLI contract, which `rule.forbid.domain-term-synonyms`
               forbids outright. `--what transcript` collides with no extant term and names exactly
               what the read opens.
- resolution = unsettled. the wisher's message carried a `?`, so the word was proposed rather than
               decreed. the shipped surface takes `story` (their word; the rework is one line of
               `CLONE_GET_WHAT_VALUES` plus a hint string), and the collision is recorded here rather
               than absorbed in silence. ⇒ itemized as fulcrum **F39**.

🟡 **the live surface therefore disagrees with this cluster, on purpose and on record.** that is the
one state a dispute is for: `rule.forbid.domain-term-synonyms` offers *adhere or dispute*, and a
wisher-coined word in a contract they asked a question about is the case the valve exists to hold.

⇒ two outcomes, per `howto.domain-term-disputes`:
- the canonical term holds → `--what transcript`, and `story` joins the forbidden list above
- `story` prevails → it earns its OWN cluster as a distinct concept (the read SURFACE, over the
  on-disk artifact), and this entry closes with the seam stated in both files

## .evidence
- rhachet stores NO transcript of its own — `genBrainSeries` builds a series in memory that carries
  only an `exid` handle; the transcript is the brain's, written under its config dir. a clone's
  `history/` holds one symlink per episode (`<exid>.jsonl`), zero-copy (`genCloneHistoryLink`).
- the transcript is the shared authority for two operations declared this round:
  - `get` (`getCloneOutput`) reads the transcript and folds its lines to the assistant replies.
  - `submit`-verify (`getCloneSubmittedCount`) counts the message text in the raw transcript — the
    brain writes each user turn there ON submit, so the transcript is the deterministic proof a
    dispatched message left the input buffer.
