# F9 — a clone under an `--async` host inherits the host marker

**the fork:** the host process carries `RHACHET_CLONE_HOST_DETACHED=1`, and its brain child inherits
it through the `...process.env` spread in `genBrainCliPtyClone`. a depth-0 clone born that way
(a human's tty `rhx enroll --async`) that runs `rhx enroll --async` for a peer reads itself as the
host and never detaches.

options: (a) fix it here: the host drops the marker right after it is read, plus an acceptance
clamp · (b) defer it to its own pr and catch a dream · (c) leave it.

**taken:** (a). first taken as (b), on the grounds that the defect predates this wish and depth
stays correct under it. three peer reviewers then named it a blocker: the peer path it breaks is
the wish's own motive (a top-level clone stands up a reviewer), and the cure is a one-line delete
at the exact seam this diff already edits. so it is both safe and clean, and it is fixed here.

**the fix:** `invokeEnroll` reads `isDetachedHost` once, then deletes both handoff keys
(`depthMinted`, `hostDetached`) before any spawn. the clamp is `enroll.acceptance` [case3] "the
child inherits neither of the host's handoff keys": with the deletes reverted it went red
(`hostDetached: "1"` reached the child); with them restored it is green.

**rework:** clean. no caller reads the marker after the host has read it.

**confidence:** 95%. the clamp was seen red, then green.

**where:** `src/contract/cli/invokeEnroll.ts` (the two deletes after the depth check) ·
`blackbox/cli/enroll.acceptance.test.ts` [case3]. the dream (b) caught was withdrawn, since a dream
for a safe, clean fix is owed as a fix.

**touched by #600:** yes — #600 (`d91e8270`) rewrote `invokeEnroll.ts`, where the two deletes
sit, and `enroll.acceptance.test.ts`, where the clamp [case3] sits. **re-verified on the rebased
tree:** the deletes merged clean inside `setCloneHostHandoffConsumed`. with them reverted, [case3]
went red: the child read itself as a host, detached again, and never ran the stub, so its dump
never appeared (`the awaited file never appeared`). that is the same defect seen through a
different symptom than before (the pre-rebase red read `hostDetached: "1"` in the dump). restored,
the whole `enroll.acceptance` file is green, 195/195.

**verdict:** —
