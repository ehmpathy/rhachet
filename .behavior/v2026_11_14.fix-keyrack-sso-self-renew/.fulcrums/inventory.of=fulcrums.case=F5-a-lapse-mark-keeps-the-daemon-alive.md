# F5 · a lapse mark keeps the daemon alive

- **the fork:**
  - (a) a mark (`lapsed`, or `halted` after a stall, case 7) keeps the daemon alive until an unlock cures it or a relock clears it
  - (b) a lapse mark keeps naught alive; the daemon exits on the extant rule (no live key, no demand for 15m)
  - (c) a lapse mark keeps the daemon alive for a bounded time
- **taken:** (a). the wish asks that the lapse be named where `keyrack status` shows it. under (b) the lapse is visible only from the lapse to ~25m after it (the grant's last minutes plus the 15m idle window), so a human who looks the next day sees no daemon and no cause. (c) adds a second clock to pick for no clear gain.
- **rework:** clean — one condition in `scheduleAutoTermination` (count lapse marks beside live entries), or its removal.
- **confidence:** 70%. low because the daemon was built to exit when idle, and (a) leaves an idle node process on a box whose human never returns. it holds no secret, only the mark.
- **where:** `1.vision.yield.md` · edgecases; `1.vision.experience.case=4.the-lapse.md`; `1.vision.experience.case=1.the-overnight-walk.md` [t5].
- **verdict:** awaited from the council.
