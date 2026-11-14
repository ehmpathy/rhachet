# F4: `sessionUrl` out of scope

- **the fork**: also write `"sessionUrl": false` into the attribution object, or leave it unset
- **taken**: unset
- **why**: claude appends a session link only for web and Remote Control sessions; an enrolled clone
  is a local pty session, so the link never applies. the wish names the footer and the co-author
  trailer, not the link. an unset key keeps the written object minimal
- **rework**: clean — one subkey
- **confidence**: 80% — a clone attached to Remote Control would get a `Claude-Session` link line;
  the commander may count that as attribution too
- **where**: same writer as F1
- **verdict**: —
