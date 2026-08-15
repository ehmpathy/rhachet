# domain.term: transcript

term.chosen   = transcript
term.kind     = noun                 # noun — the brain-cli's own on-disk record of a session's turns
term.synonyms.forbidden:
- log
- history
- conversation
- record

## .what
the brain-cli's OWN on-disk record of a session — one `<exid>.jsonl` file, one line per turn
(user + assistant), written by the brain itself under its config dir. rhachet does not author it;
a clone's `history/` symlinks to it zero-copy. it is the authority `get` reads output from and the
authority `submit` is verified against (a user turn appears the instant it is submitted).

## .refs
where the term is declared / used:
- src/domain.operations/clone/getCloneTranscriptText.ts
- src/domain.operations/clone/getCloneSubmittedCount.ts
- src/domain.operations/clone/genCloneHistoryLink.ts     # symlinks the brain's transcript into history/
- src/domain.operations/clone/getCloneOutput.ts          # folds transcript lines to assistant replies

## .reason
see the ref-level cluster beside this choice:
- `term=transcript._.choice.reason.md` — etymology, why not `log`/`history`, the zero-copy symlink model
