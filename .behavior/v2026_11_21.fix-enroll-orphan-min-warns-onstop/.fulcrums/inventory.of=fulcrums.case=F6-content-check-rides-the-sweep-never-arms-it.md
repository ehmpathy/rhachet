# F6 — the content check rides inside the sweep; it never arms the hook

- **fork**: the content check could arm the onStop sweep on its own (a third arm), or only run where a `.this` budget or a mod already arms it
- **taken**: run inside the armed sweep only
- **why**: `rule.forbid.framework-owned-hooks` forbids "a third arm no human set". a defect is not a declaration a human made; to arm a hook on the appearance of a defect would also arm it only at the next `init --hooks`, too late to matter
- **rework**: clean. add the arm to `getAllRepoThisRolesWithHooks`
- **confidence**: 80%
- **where**: `1.vision.yield.md` `.edgecases`; inventory row 3
- **verdict**: open
