# F1 — extends orgs do not union into the allowlist

**the fork** — wish §the shape, 4: an extended manifest's orgs "presumably UNION into the allowlist; worth a decision". (a) union them · (b) the list is the root's alone.

**taken** — (b). `define.root-org-inheritance` already ignores an extended manifest's `org:` and re-slugs its keys under the root, for cost isolation and "org1 keys never leak to org2". a role manifest's `org:` says who authored the role, not whose credentials this repo may read. a union would admit `ehmpathy` into every repo that extends an ehmpathy role — `dev-env-setup` extends three — with no line in that repo that says so.

**rework** — clean. a union is one merge in `hydrateKeyrackRepoManifest`, behind the same membership check. no caller hardens against (b).

**confidence** — 85%. the wish says "presumably", which reads as a lean toward (a). held below 93% because the wisher may know of a role manifest whose org IS a credential owner.

**where** — `case=7`, `1.vision.yield.md` §open questions.

**verdict** — open, for the wisher.
