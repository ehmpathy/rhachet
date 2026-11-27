# F24 — the pnpm patch routes the bun fast path through jit

- **fork**: `roles boot` and `roles cost` (the stop hook) run from the bun `.bc` binaries, which embed code at compile time. so a patch of `dist/` alone leaves the boot render and the stop sweep, the two paths this fix changes, on the published code.
  - The options:
    - (a) carry rebuilt `.bc` binaries in the patch
    - (b) patch `bin/run.bun` to exec `run.jit` for every command, so each call reads the patched `dist/`
    - (c) ship `dist/` alone and leave the director trees on the published boot and stop
- **taken**: (b).
  - (a) fails: pnpm's patch applier takes text hunks, and the binaries are ~50–100MB each.
  - (c) would ship a patch that fixes `rhx enroll` and leaves boot and the stop unfixed, so the wish's resume and stop would still refuse on a mod fault.
  - The cost is latency: each `roles boot` and `roles cost` pays the jit start (~300ms) in place of bun (~70ms), until the release replaces the patch.
- **rework**: clean. The router is one file in the patch; the release drops the patch whole.
- **confidence**: 85%. Untested is whether a director tree's hooks set a timeout tight enough that the jit start matters; the stop hook's timeout is 60s.
- **where**:
  - `.agent/repo=.this/role=any/skills/pnpm.patch.cut.sh`
  - the patch: `patches/rhachet@1.54.2.patch` in this route
  - proof: `rhx pnpm.patch.cut --into … --prove` installs the patched release into a scratch consumer and holds a stop on a stray mod file through `bin/run.bun`, exit 2
- **raised by**: the patch cut, past 5.3 (F13)
