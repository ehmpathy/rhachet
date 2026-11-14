# F14 — under a manifest, the repo actor keeps the authorless hooks in its own file

- **fork** — under a manifest the repo actor's hooks now narrow from the linked roles' declared hooks (requirement 9). its own `settings.of.repo.json` may also hold a hook with no `author` — a hand edit, the human's own. (a) keep those authorless hooks on the repo actor alone, beside its narrowed role hooks · (b) drop them, so every actor's hooks are exactly its roles' hooks · (c) carry them to every actor
- **taken** — (a). with no manifest the repo actor is never narrowed, so a hand-added hook survives every init on main; (a) keeps that for the repo actor, and requirement 9 names an authorless hook as the human's own and allowed. (b) would delete a hand edit at the next init, with no message. (c) widens what peers receive past main, where a peer's narrow already drops authorless hooks
- **rework** — clean — one branch in `asSettingsNarrowedForActor` (`genBrainCliConfigArtifact.ts`)
- **confidence** — 85% — the foreman's ask named "non-hook keys" only; whether a hand hook counts as the repo actor's own was not said
- **where** — `src/domain.operations/enroll/genBrainCliConfigArtifact.ts` `asSettingsNarrowedForActor`; yield s4
- **verdict** — unruled; best guess taken
