# F4 · the word for a portal-session end: `lapse` vs a new term

- **the fork:** (a) `lapsed`, the wish's own word · (b) a distinct word, since `lapse` already names the daemon idle-lease end (`handleKeyrackDaemonConnection.ts:108-113`, `scheduleAutoTermination.ts:54`)
- **taken:** (a), qualified on the surface as `lapsed: sso session ended`. the wish uses it, and the idle-lease sense lives only in comments, never in a contract or stdout.
- **rework:** clean — a status label and a type literal.
- **confidence:** 70%. one word for two concepts is the overload `rule.forbid.domain-term-ambiguity` forbids, if the idle-lease sense ever reaches a contract.
- **the second word, under it:** the vision's case=4 demo prints the lapse leaf as `sso session ended, renew halted`, while `halted` is also the name of the fault mark. so one word names two states on one surface, raised by i002 r010 nitpick.1 and again in the 5.3 ergonomic walk. reworded on 2026-11-21 under 5.3 i001 r001 blocker.2 (`rule.forbid.deferrals-short-of-a-dedicated-pr`): the leaf now reads `sso session ended, no renew until the next unlock`, in the code, its unit and acceptance asserts and snaps, and the case=4 demo. a one-string rework is below that rule's bar, so it outranks F12's hold. the old string is one revert away if the wisher prefers it.
- **where:** `1.vision.yield.md` · `1.vision.experience.case=4.the-lapse.md` · `asKeyrackStatusKeyBranch.ts:149` · mental model, awkward.
- **verdict:** awaited from the council.
