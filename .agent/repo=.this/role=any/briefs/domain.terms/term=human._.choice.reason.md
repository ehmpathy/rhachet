# domain.term.choice.reason: human

## .etymology
why `human`: the qualifier names WHO the variant is for — a person who reads and types the value —
not HOW it looks. the value is projected down to what a human can hold in their head (`305486e8`
instead of a 36-char uuid), at the cost of precision. the audience anchors the term, not the
surface, which keeps it durable: the same `*Human` suffix serves any value with a lossy
person-facing view.

chosen over:
- `short` / `abbreviated` — name the mechanism (a length cut), not the intent; a future non-length
  projection (a locale format, a colored render) would break the word
- `display` — over-broad; every render is a display. `human` names the specific audience
- `pretty` / `friendly` — subjective tone words, not a domain quality

## .evidence
- precedent: iso-price ships the exact pattern — `IsoPriceWords` ('USD 50.37') is the canonical
  stored/passed value, `IsoPriceHuman` ('$50.37') the lossy, locale-bound, display-only projection.
  `CloneSerialHuman` mirrors it: the full uuid serial is the canonical value, the first segment is
  the human view.
- lossy-by-design: two clones in one repo could share a first-segment prefix. the collision risk is
  accepted for the ergonomic win, and the value stays reachable — `getOneCloneByRef` falls back to a
  git-style unique serial-prefix match, and a 2+ candidate prefix fails loud rather than guess.
