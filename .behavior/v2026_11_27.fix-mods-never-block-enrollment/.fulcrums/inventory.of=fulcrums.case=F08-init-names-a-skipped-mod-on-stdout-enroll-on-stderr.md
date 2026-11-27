# F08 — init names a skipped mod on stdout; enroll names it on stderr

- **fork**: the vision (`.what this builds`, item 4) says enroll and init each print the readout of skipped mods on stderr. (a) init prints it on stderr, as written · (b) init prints it on stdout, the stream its whole mod-views readout already uses, and enroll keeps stderr
- **taken**: (b). the init readout is one tree (`asRoleModViewsChangedReadout`): the live-clone line, the reverted roles, the mods no linked role carries, and now the skipped mods. before this change that tree printed on init's stdout (`roles.mods` case1 asserts its live-clone line there). to move one branch to stderr would split one readout across two streams. enroll prints the same tree on stderr for its own reason: a json stdout stays one document, and a detached host forwards stderr
- **rework**: clean — one `console.error` in `syncAndReportBrainDirBoots`, and the init snapshots that pin the stream
- **confidence**: 80%. the vision line may have meant "not as a refusal", where stderr was only the enroll case generalized; or it may have meant a stream an install log keeps apart from stdout
- **where**: `src/domain.operations/init/boots/syncAndReportBrainDirBoots.ts`, `src/contract/cli/invokeEnroll.ts`
- **proof**: `roles.mods` per class (init stdout names the skipped mod) · `enroll.mods.integration` case8 (enroll stderr names it)
