# self review — 1.vision — has-experience-coverage

## issues found, and how each was fixed

1. **an absent dimension: connection kind.** the first decomposition had only `uid × lookup` and
   treated every connection as a say. but the gate runs once per connection on its first frame,
   for every verb (`genCloneSocketServer.ts:343-349`), and a single `clone say` cli call opens
   its own probe connections — a baseline probe (`invokeCloneSay.ts:209`) and observe probes
   (`getCloneSayObservation.ts:111`), each with a 5s reply bound
   (`CLONE_PROBE_REPLY_DEFAULT_MS`, `constants.ts:224`) that degrades to blind on a fault. a direct
   `clone get` uses the same 5s bound. fixed: added `connection kind` (`say-dispatch` ·
   `probe-in-say` · `get`) to the dimensions; the product is now 36 cells, all verdicted (grouped
   where one reason decides a group, each group's why stated).
2. **the densest walk was undemoed.** case=1 showed only the dispatch. the true critipath crosses
   four bounds in one cli call: the probe's 5s reply (degrades blind), the old 5s kill, the old
   8s gate, then lands inside the new bounds. fixed: case=1's narrative now walks the probe, then
   the dispatch, then the success line; the inventory names it as the densest walk.
3. **a con the walk exposed.** an abandoned probe's server-side `ss` scan now runs up to 60s, not
   5s. fixed: added to the vision's cons, tied to the F4 dream (an `ss`-free pid read).
4. **a `get` cell the issue's own evidence holds** (`clone get read timed out { replyMs: 5000 }`)
   is unchanged by this behavior — the 5s client reply sits below both server bounds. now itemized
   with that why, so no reader expects this fix to cure it.

5. **the after-stdout of the densest walk was wrong.** once the probes are in the walk, they go
   blind on a 9s gate, and `getCloneInputStateOrBlind` folds that into `feed-not-live`. a
   `released` verdict with `probe: 'unsupported'` renders the success line PLUS the degrade note
   (`computeCloneSayReport.ts:169-176`, copy at :137). the vision showed a bare `said to`. fixed:
   the vision's after block, its table row, and case=1 step 3 now show the degrade note, and say
   why it appears and that it is extant, true-of-the-box copy.

lesson: decompose by what the server sees (connections), not by what the human typed (commands).
one command can be three connections.

## non-issues, and why each holds

- **critipaths covered**: same-user say on a slow box (case=1, happy) and other-user deny (case=2,
  sharp). the deny case fails safe: it is fast once the lookup settles, it is loud (classed
  `MalfunctionError`, exit 1), and its copy names the fix (`run the say as the user that enrolled
  the clone`, `computeCloneOperationalRejectClass.ts:66`).
- **case=2's demo is at the gate, not a real foreign uid** — a hermetic test cannot stand up a
  second unix user. the extant `awaitCloneAuthGate.test.ts` deny cases are the proof, and the
  case file says so.
- **case=3 (slow-long) is a sharp alterpath, demoed**: rare (needs a 30s+ `ss`), and it fails
  honestly as a wedge with `acksSeen: []`, which points at the accept path. not clamped here; a
  dream holds the cure.
- **each demo carries both a narrative and a `[tn]` sketch.** checked all three case files.
- **actors**: a human and a machine caller walk the same paths; no distinct experience, so no
  separate rows — stated in the dimensions' actor line.
