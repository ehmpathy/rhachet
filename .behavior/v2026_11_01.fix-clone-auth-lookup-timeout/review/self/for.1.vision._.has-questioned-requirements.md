# self review — 1.vision — has-questioned-requirements

## issues found, and how each was fixed

1. **the clamp covered a point where the wish names a range.** the wish: a lookup "slower than 5s
   and faster than 60s is accepted". the vision clamped one point (9s), which proves the lower end
   against both old bounds (5s kill, 8s gate), but said naught of the upper end. a 59s integration
   test would prove it at a cost of a minute per run. fixed: the vision now pins the upper end with
   a unit assertion `SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS === 60_000` beside the order assertion,
   and says why the two proofs together cover the range: the integration point proves the exec
   honors the constant; the unit proves its value and order.

2. **the 60s requirement's cost was unpriced.** a second pass asked "what if we do this — what
   happens to load?" the say cli's observe loop opens a probe every ~1.25s (1s reply,
   `CLONE_SAY_PROBE_REPLY_MS`, + 250ms poll, `CLONE_SAY_POLL_MS_MIN`; loop at
   `getCloneSayObservation.ts:90-149`). each probe connection starts a gate, each gate an `ss -xp`
   that outlives the probe. the 5s kill used to cap that at ~4 concurrent scans; with a 60s bound,
   a box where `ss` takes T seconds runs ~T / 1.25 at once per observed say (~32 at T = 40s) — the
   scans feed the load that slows them. fixed: the vision now prices this as a con with the
   arithmetic shown, records the choice to defer the abort as fulcrum F6 (70%), catches the abort
   as a dream with its shape and clamp, and asks the wisher whether the abort should ride along.
   the 60s requirement itself stays — it is the wisher's.

## requirements questioned, and why each holds

- **lookup bound = 60s.** who: the wisher, in the wish. evidence: issue #678's five traces of
  `Command failed: ss -xp …` with an empty stderr — the exec kill — on a same-uid caller. without
  it: the false deny continues on every loaded box. could a smaller value serve? 30s would align
  with the client's wedge floor and make the 30–60s cell moot — but the value is the wisher's to
  set (`rule.forbid.dropped-behavioral-requirements`), so the vision keeps 60s and surfaces the
  tension as fulcrum F3 + a dream, never narrows it.
- **gate bound above the lookup bound.** evidence: the issue's cause #2 — the inversion means a
  slow lookup always reads as a deny, never as `auth-gate-timeout`. without it: a 60s lookup under
  an 8s gate would turn every slow lookup into `auth-gate-timeout` — a different false refusal.
  holds; the derivation (`+ 5_000`) makes it structural rather than a comment.
- **same-user say on a loaded box accepted.** holds up to the client's wedge window. the vision
  says so plainly (awkward section, case=3) rather than claim more than the change delivers. this
  is the one place where the outcome as worded can outrun the scope; flagged for the wisher.
- **scope: is it too small?** the issue lists three more cures (F4). each is additive and owes its
  own clamp; the wish chose the bounds. scope holds; dreams caught.
- **scope: is it too large?** the derived constant and its move to `src/infra/socket/` are one
  file more than a bare literal edit. kept: the bare edit is how the inversion happened the first
  time (two literals, two files, one comment to hold them in order).
- **a simpler way?** two literal edits would satisfy the wish's letter. the derivation costs one
  import and removes the class of defect. the fake-`ss` clamp costs a temp executable and a `PATH`
  swap, and in return drives the real exec kill; an injected timeout would test the seam.
- **where the new constant lives.** questioned on a second pass: should
  `SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS` sit in the clone's `constants.ts`? no — `getSocketPeerCred`
  lives in `src/infra/socket/`, and infra must not import from `domain.operations`
  (`rule.require.directional-deps`). the clone's gate constant imports down from infra, the
  allowed direction. so the constant lives beside its exec, in infra. holds.
- **the +5s slack.** not asked for; the wish says only "above". 5s is the smallest round headroom
  that covers the `/proc` stat and the settle after a kill. recorded as F1 (clean rework).
- **pr today, suite green, release watch green.** process requirements from the wisher; none to
  question, carried into execution.
