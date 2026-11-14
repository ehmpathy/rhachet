# F1 · renew obeys the unlock `--duration` cap

- **the fork:**
  - (a) a renew never extends a key past min(requested duration, maxDuration) from the unlock moment
  - (b) a renew runs unbounded while the portal session lives
  - (c) a renew obeys an explicit `--duration` alone; with no flag, it runs while the portal lives
- **taken:** (a). the human chose the duration at unlock; to outlive it would make `--duration` a lie. in the default case (9h duration, ~8h portal) the portal ends first, so (a) costs the wish's outcome naught by default.
- **rework:** clean — the cap is one comparison in the renew; to drop it, or to apply it only when the flag was passed, edits that one comparison and the record field it reads.
- **confidence:** 65%. low for two reasons:
  - the wish says "for as long as the human's sso portal session is live", which reads closer to (b)
  - the portal session length is set by the org's identity center admin, not by keyrack. where it outlasts 9h, (a) ends the key while the portal still lives, and 0901 goes dark at the cap. (c) closes that gap and still honors a human who chose a short duration
- **where:** `1.vision.yield.md` · edgecases, open questions; `1.vision.experience.case=6.the-cap-holds.md`.
- **verdict:** awaited from the wisher.
