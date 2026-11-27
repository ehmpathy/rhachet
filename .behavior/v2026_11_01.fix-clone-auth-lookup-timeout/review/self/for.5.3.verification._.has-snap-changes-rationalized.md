# self review — 5.3.verification — has-snap-changes-rationalized

`git status --porcelain -- '*.snap'` lists six files: two modified, four added. none deleted. I read
each diff whole.

## `src/domain.operations/clone/socket/__snapshots__/computeCloneSayReport.test.ts.snap` — modified

| entry | change | intended | rationale |
|---|---|---|---|
| `released + probe-unanswered` | added | yes | the success tree on a loaded box: `😶🎙️ said to @:x` + one `🟡 screen probe unanswered (a loaded box) — verified by transcript; no action needed` leaf. same two-line shape as its peers; the leaf names the cause and says no action is owed |
| `unreadable feed-not-live` | key renamed + hint changed | yes | the old hint opened "wait a moment and retry" on a say that is always `delivered: true` — a retry types the message twice (conceded urgent, i006 r10 blocker.1). the new hint opens `do NOT blind re-send`, names `clone get`, and keeps the brand-new-clone self-heal note and the re-enroll-if-it-recurs cure. `message` and `klass` unchanged |
| `unreadable probe-unanswered` | added | yes | names the loaded box, forbids a blind re-send, says wait, names the `get` dead end, says a re-enroll does not help |

- the renamed key replaced its old key in the same diff (one `-exports[…]`, one `+exports[…]`), so no
  obsolete entry is left behind
- regressions checked: no lost structure (the tree glyphs are intact), no message got less helpful
  (each new hint names a next move), no volatile value (the fixture uses `@:x`)

## `blackbox/cli/__snapshots__/clone.say.slowbox.realbrain.acceptance.test.ts.snap` — added

- `[case1]` stdout, whole — the same two-line success tree as the unit entry above, from a real
  claude through the cli. it proves the unit copy is what a human reads
- `[case2]` stderr, whole — the `💥 MalfunctionError:` auth-denied copy, then `socketPath` and
  `reason: auth-denied`
- volatile values: the serial → `__SERIAL8__`, the socket path → `"__SOCKET__"` (both quotes kept)

## `blackbox/cli/__snapshots__/clone.say.slowbox.integration.test.ts.snap` — added

- `[case2]` stderr — the `💥 MalfunctionError:` header, then the metadata block: `hint`,
  `delivered: true`, `verdict: unreadable`, `reason: probe-unanswered`, `probe: unsupported`
- volatile values: `serial` → `__SERIAL__`, the debug-log date → `__DATE__`, the temp dir →
  `/TMP_TEST_DIR`. the slug (`slowbusy`) is fixed by the test. no elapsed time reaches the output

## `src/domain.operations/clone/socket/__snapshots__/genCloneSocketServer.integration.test.ts.snap` — added

two entries (`[case20]`, `[case21]`), each the whole deny message, with the per-run socket path
masked to `__SOCKET__` — the same token the blackbox masker writes.

one honest note on the content: `[case20]`'s copy says "run the say as the user that enrolled the
clone" for a caller that is unseen in `ss` — which may be the same user. that is the false cure #683
owns, and it is deliberate to pin it: #683's fix will move this snapshot on purpose, which is the
signal it landed (recorded in the `clone-auth-lookup-fault-reason` dream).

## `src/domain.operations/clone/cli/__snapshots__/asCloneInputSurfaceText.test.ts.snap` — added

eight entries, every unreadable tree the renderer can emit: one per probe-blind reason (five), the
`queue` header for `probe-unanswered`, a daemon that predates the content read, and an
`unrecognized` screen. each is the `could not be read` header, the cause on a `cause` subbranch, its
own fix on a `fix` subbranch. the fixture uses `@:x`, so no value is volatile.

## `blackbox/cli/__snapshots__/clone.say.withheld.acceptance.test.ts.snap` — modified

one entry: the `[case10]` modal tree's `cause:` / `fix:` leaves moved to subbranches
(`rule.forbid.colons-in-stdout`). its text is unchanged.

## found

none accidental. six files, each entry with a rationale above. no bulk `--resnap` was run: each
snapshot was written by the one scoped test that owns it, then passed an independent run with no
`--resnap` (the proof rows in `5.3.verification.yield.md`).
