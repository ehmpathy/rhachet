# F5 — the default actor drives bare enroll and the repo brain dir

- **fork** — the default actor scopes only `rhx enroll` with no `--roles`, vs also the repo brain dir a bare `claude` reads
- **taken** — both: one notion of "the repo's default", where today both read `getAllLinkedRoleRefs` (`syncDefaultBrainDir.ts:39`, `invokeEnroll.ts:211-242`)
- **rework** — clean: both consumers read one derived set
- **confidence** — 75%; the extant brief keeps a "default role-set" separate from actors, so the merge of the two senses needs the wisher's eye
- **where** — case=4, Q3, "what is awkward"
- **verdict** — **superseded by F12.** main (d91e8270, #600) settled the single notion itself: the repo actor holds the ambient roles and `<repo>/.claude` links to its brain dir. what remains open is only who the repo actor is under a manifest, which F12 carries
