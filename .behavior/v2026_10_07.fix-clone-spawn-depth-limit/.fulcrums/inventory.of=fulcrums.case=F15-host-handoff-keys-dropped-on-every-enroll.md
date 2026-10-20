# F15 — the host handoff keys are dropped on every enroll, not only on a host

**the fork:** `setCloneHostHandoffConsumed` in `invokeEnroll.ts` deletes `RHACHET_CLONE_DEPTH_MINTED`
and `RHACHET_CLONE_HOST_DETACHED` from `process.env` after the depth is read. options:
(a) delete them on every enroll · (b) delete them only inside the host branch, so a non-host never
touches ambient env.

**taken:** (a). the two keys are a handoff from one `--async` caller to one detached host, and no
process past that host should carry them. a non-host can still hold one: a stray key inherited from
a host that crashed before it consumed the pair, or a single key a foreign tool set. the host replay
needs both keys, so a lone key is inert in this process, but its child inherits it. a later
`--async` in that child sets both keys again, and the lone stray then rides along unseen. (b) would
leave that stray alive on exactly the paths that are not the host. so the delete runs on every
enroll, after the one depth read, and the invariant "no clone past the host holds a handoff key"
holds however a key arrived.

the order guard is structural: `setCloneHostHandoffConsumed({ isTty })` does the depth read
(`asCloneSpawnDepth`, which replays `depthMinted`) and the host-marker read in its own body, then
deletes both keys, and returns `{ depth, isDetachedHost }`. no caller can run the delete before
the read, because the one function owns both. (an earlier `_input: { depthRead }` parameter that
guarded the order from outside is gone.)

**rework:** clean. a move of the delete into the host branch is one line, should the council
prefer (b).

**confidence:** 80%. the reviewer graded it a nitpick on ambient-state grounds, and (a) does write
ambient env on a path where it is most often a no-op.

**where:** `src/contract/cli/invokeEnroll.ts` (`setCloneHostHandoffConsumed`) · the clamp
`blackbox/cli/enroll.acceptance.test.ts` [case3].

**touched by #600:** yes — #600 (`d91e8270`) rewrote `invokeEnroll.ts` (191 lines) and
`enroll.acceptance.test.ts` (722 lines), the home of the op and of its clamp [case3].
**re-verified on the rebased tree:** the op merged clean, and the delete still runs on every enroll,
after the one read. the clamp [case3] went red with the deletes reverted and green restored (see F9,
which shares the clamp).

**verdict:** —
