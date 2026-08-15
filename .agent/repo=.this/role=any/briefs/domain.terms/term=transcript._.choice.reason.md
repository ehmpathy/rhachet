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
none. `transcript` is the brain-cli's own term for the artifact; rhachet adopts it rather than
coin a synonym.

## .evidence
- rhachet stores NO transcript of its own — `genBrainSeries` builds a series in memory that carries
  only an `exid` handle; the transcript is the brain's, written under its config dir. a clone's
  `history/` holds one symlink per episode (`<exid>.jsonl`), zero-copy (`genCloneHistoryLink`).
- the transcript is the shared authority for two operations declared this round:
  - `get` (`getCloneOutput`) reads the transcript and folds its lines to the assistant replies.
  - `submit`-verify (`getCloneSubmittedCount`) counts the message text in the raw transcript — the
    brain writes each user turn there ON submit, so the transcript is the deterministic proof a
    dispatched message left the input buffer.
