/**
 * .what = writes the boot payload to stdout in one write, and resolves only once the stream
 *         has taken every byte
 * .why = a boot is read through a pipe — a hook, a harness, a `| head`. under bun, once aught
 *        has touched `process.stdout` (the cli's closed-pipe guard does, at startup), a
 *        `console.log` into a FULL pipe is dropped in silence: a reader that lags gets one pipe
 *        buffer (~64KB), the rest is lost, and the exit is still 0. an awaited
 *        `process.stdout.write` is held until the reader drains, so every byte lands
 *
 * .note = measured 2026-10-22 with a reader that waits 3s: `console.log` per line delivered
 *   64,923 of 261,790 bytes; this write delivered all of them
 * .note = the caller passes `asBootEmittedPayload`, the exact bytes the budget gate counted,
 *   so the wire and the count stay one number
 */
export const emitBootPayloadDrained = async (input: {
  payload: string;
  stream?: NodeJS.WritableStream;
}): Promise<void> => {
  const stream = input.stream ?? process.stdout;
  await new Promise<void>((done, fail) => {
    stream.write(input.payload, (error?: Error | null) =>
      error ? fail(error) : done(),
    );
  });
};
