import { computeCloneInputContent } from '../screen/computeCloneInputContent';
import { computeCloneInputState } from '../screen/computeCloneInputState';
import type {
  CloneScreenLive,
  CloneScreenRead,
} from '../screen/genCloneScreenFeed';
import type { CloneGetReply } from './asCloneGetReply';

/**
 * .what = narrow a rendered screen to its LIVE VIEWPORT — the last `rows` lines — dropping
 *   the emulator's scrollback
 * .why =
 *   - it is what the verdict was computed FROM. every read in `computeCloneInputState` —
 *     `countOnScreen`, the modal scan, the input band — slices `lines.slice(lines.length -
 *     rows)` first. so a debug grid that carried scrollback would show a reader rows the
 *     classifier provably ignored, which is worse than an absent grid: it invites a diagnosis
 *     against evidence that decided no part of the outcome
 *   - the feed runs `scrollback: 1000`, so an unclamped grid is up to ~1000 rows. `clone say`
 *     probes with `debug: true` on EVERY poll cycle (~60 per dispatch at the 250ms floor), so
 *     the unclamped form ships that buffer ~60 times per say — a real cost on a read whose
 *     own reply bound is 1000ms, and a failure log of ~2000 rows no human would read
 * .note = the SHAPE is preserved, `rows` and `cols` included, so the render still states the
 *   geometry — only the off-screen history is dropped. a grid shorter than `rows` (a young
 *   feed) is handed back whole, since `slice` of a negative start would wrap
 *
 * .note = 🔴 BOTH grids are clamped by the SAME window. `lines` and `linesBright` are one
 *   screen read at two intensities, and every consumer reads them as index-aligned — the
 *   classifier slices one row window across both (getInputBand), and the debug renderer
 *   prints them side by side to show whether a dim signal was available. clamp only `lines`
 *   and the pair silently desynchronizes by the scrollback depth (~1000 rows), so row 18 of
 *   one grid is row 1018 of the other: a diagnosis read against a screen that never existed
 */
const asViewportGrid = (input: {
  screen: CloneScreenLive;
}): CloneScreenLive => {
  const { screen } = input;
  const viewportStart = Math.max(0, screen.lines.length - screen.rows);
  return viewportStart === 0
    ? screen
    : {
        ...screen,
        lines: screen.lines.slice(viewportStart),
        linesBright: screen.linesBright.slice(viewportStart),
      };
};

/**
 * .what = classify a server-side screen read into the get-reply a probe answers with —
 *   a live screen carries a classified input state (`probe: 'capable'`), a screen that is
 *   not live degrades to the honest `feed-not-live` probe-blind reply (`probe: 'unsupported'`)
 * .why = a probe is a READ: the server reads its rendered screen and must hand back the SAME
 *   `CloneGetReply` shape the client parses (`asCloneGetReply` is the mirror, client-side).
 *   one owner of the screen→reply classify-or-degrade, so the socket loop reads a named call
 *   rather than an inline ternary (r4.n2), and the degrade is the honest `feed-not-live` that
 *   drives `unreadable` rather than a false `absent` (V7)
 *
 * .note = the server declares its own feed's cause — `feed-not-live` (not yet attached) or
 *   `feed-faulted` (an emulator write/resize threw, so the grid is in doubt). the two name
 *   DIFFERENT remedies (wait vs re-enroll), so the screen's own reason is carried verbatim,
 *   never flattened to one slug. `peer-probe-blind` is never a self-report: it names an OLDER
 *   daemon that cannot answer a probe at all, so only the CLIENT infers it (asCloneGetReply)
 *
 * .note = `debug` attaches the RAW rendered grid beside the classification. it is OFF by
 *   default, and that default is the F02/F03 invariant: a probe answers with a
 *   classification, never the brain's screen bytes, so the socket never becomes a session
 *   oracle a routine read can harvest. a caller opts in only to DIAGNOSE its own dispatch —
 *   `clone say` asks for it so a failure verdict can name the exact rows it was computed
 *   from, which is the one gap that made an `absent` on a landed message undiagnosable (F15)
 *
 * .note = `content` is the NARROW opt-in beside that wide one, and the two are separate flags
 *   because they grant different widths. `debug` hands back the whole viewport — every turn the
 *   brain rendered; `content` hands back the two INPUT surfaces only, which is the surface a
 *   human already owns (they typed into it) and the one a refusal was decided on. so a human
 *   who asks "what is in my box?" pays for the box, never for the session (F03)
 */
export const asCloneGetReplyFromScreen = (input: {
  screen: CloneScreenRead;
  needle: string;
  debug?: boolean;
  content?: boolean;
}): CloneGetReply => {
  if (!input.screen.live)
    return { probe: 'unsupported', reason: input.screen.reason };

  const state = computeCloneInputState({
    screen: input.screen,
    message: input.needle,
  });

  // both payloads ride ONLY on an explicit opt-in, and both are computed from the SAME screen
  // read the classification above was computed from — so a reader diagnoses against the rows
  // the verdict actually saw, never a re-read taken a tick later
  return {
    probe: 'capable',
    state,
    ...(input.debug === true
      ? { grid: asViewportGrid({ screen: input.screen }) }
      : {}),
    ...(input.content === true
      ? { content: computeCloneInputContent({ screen: input.screen, state }) }
      : {}),
  };
};
