# F13 — the key row's `tip:` header stays as main renders it, in this pr

- **fork** — render every key row's tip as a `💡 tip` header node with each part as a child leaf (`rule.forbid.colons-in-stdout`, `rule.prefer.emoji-language` §the tip form) · keep main's `└─ tip: <head>` header and hang only this pr's new `;` sub-leaves beneath it
- **taken** — keep main's header, here. the `tip:` header is main's text; this pr moved its render into `asKeyrackTipLines` and added the sub-leaves, but left the header's words as they were. the header change is owed, and lands in a dedicated pr: `.dream/v2026_11_16.feat.keyrack-key-row-tip-as-emoji-header.md`
- **rework** — dirty here, clean alone. the render is one line, but every keyrack key row renders through it: about 100 snapshot lines in 22 suites move (the vault suites, the reach and org suites, the sdk source suites), none of them on this pr's surface. that churn in a pr whose wish is the off-ec2 mint would bury the off-ec2 diff under a repo-wide render change. as its own pr the same edit is one line plus one resnap
- **confidence** — 70%. the rule reads an edited line as owed; this pr edited the function, not the header's words. a reviewer who reads the move as an edit has a fair case
- **where** — peer round i003 r001 blocker.1; `src/domain.operations/keyrack/cli/asKeyrackTipLines.ts`
- **verdict** — disputed at i003; to commander at pr
