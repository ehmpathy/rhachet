# F32 — a repo's `actors.yml` lists its actors under `actor:`, singular

- **fork** — the 5.3 i004 snapshot-blemishes lane (nitpick.10) read two keys for one concept: a
  repo's `.agent/actors.yml` lists actors under `actor:`, while the `rhachet.repo.yml` a package
  publishes carries them under `actors:`. (a) keep both as they are · (b) rename the manifest key to
  `actors:` · (c) accept both in the manifest
- **taken** — (a).
  - `actor:` is the shape `howto.author-actors-yml` already documents, and the vision adopted it
    (`1.vision.yield.md`, the manifest sketch); a consumer manifest key is the wisher's contract
  - the two files are two contracts: `actors.yml` is hand-authored, one entry per `- slug:`, and
    reads as `actor: [ … ]`, a list of actor entries; `rhachet.repo.yml` is generated, and its
    `actors:` sits beside `roles:`, the plural collection keys of a registry manifest
  - (c) is two spellings for one key, which `rule.forbid.domain-term-synonyms` forbids outright
- **rework** — dirty-ish — the key is read by `asActorsManifest`, written in every acceptance
  fixture, the howto brief, and the refusal hints; a rename after a repo adopts it is a migration
- **confidence** — 60%; the plural reads more natural to some, and the publish file already uses it,
  so a human may well prefer (b) before any repo adopts the manifest
- **where** — `src/domain.operations/actor/manifest/asActorsManifest.ts`;
  `.agent/repo=.this/role=user/briefs/actors/howto.author-actors-yml.md`
- **verdict** — unruled — raised for the council
