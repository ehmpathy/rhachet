# domain.term: buffered

term.chosen   = buffered
term.kind     = adj
term.synonyms.forbidden:
- typed
- drafted
- uncommitted
- unsent
- unsubmitted

## .what

**our text sits in the input region, the submit did not take.** the first state of the input
triple (`buffered → enqueued → released`) — the bytes were written into the box at the screen's
foot, but no user turn left it.

it is a failure verdict: exit 1, stderr, class `malfunction`. the message is in the box, so a
re-send would APPEND to it and wedge the line — the caller must verify, never re-send blind.

## ⚠️ .the boundary — `buffered` is IN the box, `enqueued` is ABOVE it

the two are one step apart in the triple and part on WHERE the text sits:

| term | where the message sits | the rise that proves it |
|------|------------------------|-------------------------|
| **`buffered`** | in the input region (the box) | `countInInput` rose |
| `enqueued` | in the queue above the box | `countOnScreen` rose, region clear |

so `buffered` reads *"the bytes are still in the box"* and `enqueued` reads *"the bytes left the
box into the queue."* the verdict order checks `enqueued` first: a clear region with a screen-count
rise is the stronger state, and `buffered` is the residual when the text never left the box.

## ⚠️ .the boundary — a REGION, never a row

`buffered` reads a region-scoped count (`countInInput`), never a single row. `asCloneDispatchFrame`
wraps a multi-line message in the bracketed-paste markers, so its interior newlines land in the box
as real lines and the message occupies several rendered rows; a row-scoped read would make
`buffered` unreachable on a multi-line entry and reintroduce the clobber defect on a human's
multi-line work.

## .refs
- `src/domain.operations/clone/socket/computeCloneSayVerdict.ts`  # the `buffered` branch — countInInput rose
- `src/domain.operations/clone/socket/computeCloneSayReport.ts`   # the `input-region-holds-text` copy (do NOT re-send)
- `src/domain.operations/clone/screen/computeCloneInputState.ts`  # the input-region classification the count reads

## .reason
see the ref-level cluster beside this choice:
- `term=buffered._.choice.reason.md` — etymology, the four rejected peers, the re-send hazard
