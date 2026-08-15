import { Console } from 'node:console';
import { Writable } from 'node:stream';

/**
 * .what = run a fn with the console's stdout/stderr streams redirected into local
 *   buffers, then return what each stream received
 * .why =
 *   - integration tests must capture a command's stdout/stderr WITHOUT a mock
 *     (rule.forbid.integration.mocks) — a real stream redirect is the sanctioned
 *     capture: swap the global console for a REAL node Console whose two streams
 *     are in-memory sinks, so the code under test runs for real and only its
 *     output is diverted (no jest.spyOn, no mock object)
 *   - a real Console + real Writable sinks is a true redirect, and it survives
 *     jest's own buffered console (which the process-stream level does not)
 */
export const withCapturedStreams = async <T>(input: {
  run: () => Promise<T> | T;
}): Promise<{ out: string; err: string; result: T }> => {
  const outChunks: string[] = [];
  const errChunks: string[] = [];

  // an in-memory sink: each write appends the chunk, then signals completion so a
  // caller that awaits the write never hangs
  const asSink = (buffer: string[]): Writable =>
    new Writable({
      write(chunk: unknown, _charset: unknown, done: () => void): void {
        buffer.push(typeof chunk === 'string' ? chunk : String(chunk));
        done();
      },
    });

  // .note = deliberate mutation — swap the global console for the span of run,
  //   restore it in the finally; the two sinks never escape this call
  const consoleBefore = globalThis.console;
  globalThis.console = new Console({
    stdout: asSink(outChunks),
    stderr: asSink(errChunks),
  });
  try {
    const result = await input.run();
    return { out: outChunks.join(''), err: errChunks.join(''), result };
  } finally {
    globalThis.console = consoleBefore;
  }
};
