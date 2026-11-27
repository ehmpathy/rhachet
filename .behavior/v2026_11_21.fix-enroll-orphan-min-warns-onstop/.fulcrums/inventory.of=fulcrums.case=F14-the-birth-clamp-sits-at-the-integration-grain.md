# F14 — the birth clamp sits at the integration grain

- **fork**: move the birth clamp to the acceptance grain, or keep it at integration
- **taken**: keep it at integration
- **why**: a clone birth runs a brain-cli. the clamp runs a stub brain on PATH, and a stub in an acceptance test is the fake `rule.forbid.faked-or-quarantined-acceptance` forbids, so the stub-brain grain is integration. ci runs the integration tier on every push, with the keys its globalSetup reads. this box lacks those keys, so the file was verified through a temporary acceptance-named copy: 32/32, 5 snapshots passed. the pr's ci run is the proof at its own grain
- **rework**: clean. a rename, plus a real-brain run under the brain-live flag
- **confidence**: 85%
- **where**: peer review i002 r8 nitpick.3
- **verdict**: open
