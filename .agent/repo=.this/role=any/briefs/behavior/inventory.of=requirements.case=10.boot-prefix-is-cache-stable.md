# requirement: a clone's boot is a byte-stable prefix the brain caches

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- every clone of one role set sends the same boot bytes, in every session, in every worktree: no
  path, date, session id, or other per-run value sits inside the boot
- the boot is whole: each brief the role set boots (`boot.yml` say and ref) is in it; none is cut to
  shrink the figure
- the published roles come first and the `repo=.this` roles last, parted by one cache boundary line, so
  an edit to a `repo=.this` brief re-writes only the tail and the published prefix stays a cache read
- a second session of one role set reads the boot from cache rather than write it again

## .clamp

- `src/domain.operations/boot/setBrainDirBoot.ts` — the one render; roles in a fixed order, no
  per-run value in the corpus
- `src/domain.operations/boot/asRoleRefsInCacheOrder.ts` — published roles, then `repo=.this`
- `src/domain.operations/boot/getOneBootCacheBoundary.ts` — the boundary line claude splits on
- `src/domain.operations/enroll/asBrainCliSpawnArgs.ts` — the boot reaches the clone as
  `--system-prompt-file`, the block claude caches ahead of the per-session values

## .proof

| tier | test | status |
|---|---|---|
| integration | `src/domain.operations/boot/setBrainDirBoot.integration.test.ts` [case1] [t1]–[t3] — two role orders, two renders, two repo paths: byte-equal | ✅ green 2026-11-02 |
| integration | `src/domain.operations/boot/setBrainDirBoot.integration.test.ts` [case5] — published before the boundary, `repo=.this` after; a local edit leaves the prefix byte-equal | ✅ green 2026-11-02 |
| integration | `src/domain.operations/boot/setBrainDirBoot.integration.test.ts` [case1] [t0] — every role's briefs are in the boot, snapped | ✅ green 2026-11-02 |
| acceptance | `blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` [t3] — two real `-p` sessions on claude 2.1.292 send byte-equal system and tools blocks (raw request; the vendor's per-request `cc_prompt_id` masked, F15), and the second reads the boot from cache: 5,761 read, 379 written, for a ~4,900-token boot | ✅ green 2026-11-04 |
| acceptance | same file [t3] — a later turn of the second session (`--resume`) reads the boot from cache: 6,143 read, 155 written | ✅ green 2026-11-04 |
| acceptance | same file [t3] — a session from another repo path sends byte-equal system and tools blocks and reads the boot from cache: 5,764 read | ✅ green 2026-11-04 |

measured byhand with `rhx boot.cache.probe`, 2026-11-02, haiku: a second session wrote 4,800 tokens
and read 132,111 from cache; from a second worktree at another path, it wrote 4,147 and read 132,111.

## .source

the wish of `.behavior/v2026_11_02.fix-boot-briefs-cacheable` (ehmpathy/rhachet#398), 2026-11-02: the
boot loads as one stable prefix, keeps every brief, and a clamp goes red on a volatile value.
