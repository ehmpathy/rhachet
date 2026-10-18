# F14 — the enroller's keyrack guide is re-seeded to its own repo, never written here

**the fork** — the enroller guide `howto.add.keyrack.[guide].md` still names `org:` as one org. (a) edit it in this pr · (b) re-seed it to the repo that owns it.

**taken** — (b). the guide's only copy on this box is `node_modules/.pnpm/rhachet-roles-rhachet@0.1.7…/dist/…` — a built artifact of `ehmpathy/rhachet-roles-rhachet`. an edit there is overwritten at the next install and never reaches its source; a write to the source repo is a write outside this tree, which this drive may not make. the size of the edit is not the reason — the reach is.

**what is done** — the dream `.dream/v2026_10_06.reseed.enroller-keyrack-guide-names-org-as-one-org.md` carries the exact three-line fix, and the task is pushed via `radio.task.push --via gh.issues --into ehmpathy/rhachet-roles-rhachet`, held QUEUED behind the global radio gate. this repo's own allowlist doc landed: `.agent/repo=.this/role=keyrack/briefs/define.keyrack-org-allowlist.md`.

**the ask** — a human runs `rhx radio.uses --global allow`; the next push delivers the held task.

**rework** — clean. a three-line doc edit in the owner repo.

**confidence** — 85%.

**where** — `howto.add.keyrack.[guide].md` in `ehmpathy/rhachet-roles-rhachet` (role=enroller).

**verdict** — open.
