/**
 * .what = watches for the loss of a clone's host — its input ended, or its parent died — and
 *   calls `onLoss` once
 * .why = a terminal can go away with no hangup: its input ends or errors, or the parent dies and
 *   the host is reparented in silence. no human remains at the brain, so the brain must end
 *
 * .note = the parent read is a poll on an unref'd timer: posix gives an orphan no event, and the
 *   timer must never hold the host alive on its own
 * .note = an input end is a loss only on a tty. a pipe or `/dev/null` ends as soon as its caller
 *   has no more to give — `enroll --await -p` from a command starts with stdin already closed —
 *   and the brain must still answer. a tty ends only when its terminal goes away
 * .note = returns an unsubscribe, the same shape as every other host wire
 */
export const genHostLossWatch = (
  input: { onLoss: () => void },
  context: {
    stdin: NodeJS.EventEmitter & { isTTY?: boolean };
    getPpid: () => number;
    intervalMs: number;
  },
): (() => void) => {
  // call onLoss once, however many signs of loss arrive; the poll stops with the first
  // .note = deliberate mutation — a one-shot latch local to this watch
  // .note = `timer` is read only when a loss fires, which is after it is set below
  let lost = false;
  const fire = (): void => {
    if (lost) return;
    lost = true;
    clearInterval(timer);
    input.onLoss();
  };

  // the parent changed: the one who launched this host is gone
  const ppidAtStart = context.getPpid();
  const timer = setInterval(() => {
    if (context.getPpid() !== ppidAtStart) fire();
  }, context.intervalMs);
  timer.unref();

  // the terminal's input ended or errored: the terminal is gone. a pipe's end is no loss
  const isInputTerminal = context.stdin.isTTY === true;
  if (isInputTerminal) context.stdin.on('end', fire);
  if (isInputTerminal) context.stdin.on('error', fire);

  return () => {
    context.stdin.off('end', fire);
    context.stdin.off('error', fire);
    clearInterval(timer);
  };
};
