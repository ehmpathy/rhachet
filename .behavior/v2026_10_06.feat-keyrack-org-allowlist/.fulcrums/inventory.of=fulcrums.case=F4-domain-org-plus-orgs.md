# F4 — the domain object keeps `org` as the default and gains `orgs`

**the fork** — `KeyrackRepoManifest.org: string` is read by ~12 sites. (a) change `org` to `string[]` and update each · (b) keep `org: string` as the DEFAULT (= `orgs[0]`) and add `orgs: string[]`, the allowlist.

**taken** — (b). every extant read of `manifest.org` means "the default org" — slug construction, `@this` expansion, sweep slugs, sudo slugs. under (b) each keeps its sense with no edit; only the four mismatch sites switch from `=== org` to `orgs.includes(x)`. (a) touches every site and invites one to pick `org[0]` and another the whole list.

the yaml key stays `org:` (wish §the wish), so the file and the object differ in shape on purpose: the file speaks of one line, the object of two facts.

**rework** — clean. an internal shape; no published contract carries it.

**confidence** — 85%.

**where** — `1.vision.yield.md` §groundwork.

**verdict** — open.
