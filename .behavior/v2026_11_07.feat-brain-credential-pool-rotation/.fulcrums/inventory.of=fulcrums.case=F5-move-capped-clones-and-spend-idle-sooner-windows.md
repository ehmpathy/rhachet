# F5 — move clones off a capped or dead member, and spend an idle window that resets sooner

- **the fork:** move only capped/dead clones · re-home every clone to the soonest reset at each tick
- **taken (revised at self review):** capped/dead always, plus a healthy clone onto a member with headroom that resets sooner and that no clone draws on. the first draft moved only capped/dead clones; with no new spawns that let a sooner window expire unspent, against the amendment's "no capacity left unused". a full re-home was not taken: it churns every clone for a rank win, and each move risks a swap that does not land
- **rework:** clean — a rank filter
- **confidence:** 75% — the idle-member rule is my interpretation of "no capacity left unused"; the commander may want the full re-home
- **where:** `1.vision.yield.md` §4, case 4 `[t4]`, `[t5]`
- **verdict:** —
