# domain.term: submit

term.chosen   = submit
term.kind     = verb                 # verb — the act a clone's brain performs on a dispatched message
term.synonyms.forbidden:
- send
- enter
- commit
- post

## .what
the act of a dispatched message LEAVING the clone's input buffer into the brain — recorded as a
processed user turn. distinct from `say` (which only delivers bytes to the socket): a message
can be `delivered` to the socket yet never `submit`ted, if the submit keystroke rides the same
pty read as the paste-close and the TUI commits an empty line.

## .refs
where the term is declared / used:
- src/domain.operations/clone/getCloneSubmittedCount.ts
- src/domain.operations/clone/getCloneSubmitLanded.ts
- src/domain.operations/clone/socket/constants.ts             # CLONE_SUBMIT + the submit-delay trio
- src/domain.operations/clone/socket/computeCloneSubmitDelay.ts # the length-scaled pre-submit delay
- src/domain.operations/clone/constants.ts                     # CLONE_SUBMIT_VERIFY_TIMEOUT_MS
- src/contract/cli/invokeCloneSay.ts                     # self-verifies the submit landed

## .reason
see the ref-level cluster beside this choice:
- `term=submit._.choice.reason.md` — etymology, the say-vs-submit distinction, the dogfood defect
