/**
 * .what = a console.log spy that also records every `process.stdout.write`, in call order
 * .why = a boot payload reaches stdout through one awaited `process.stdout.write`
 *        (`emitBootPayloadDrained`), while a notice still goes through `console.log`.
 *        one spy that holds both lets `asLogLines` grade CONTENT, never the emit mechanism
 * .note = a write is recorded as a console.log call with its final newline cut, so
 *         `mock.calls`, `mockClear` and call counts read the same for either path
 * .note = the write spy lives from `beforeAll` to `afterAll` of the describe that calls
 *         this, so each block holds its own, and `process.stdout` (the real process object
 *         under an in-band run) is never left patched
 */
export const spyOnStdoutLines = (): jest.SpyInstance => {
  const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});

  let spyWrite: jest.SpyInstance | null = null;
  beforeAll(() => {
    spyWrite = jest.spyOn(process.stdout, 'write').mockImplementation(((
      chunk: unknown,
      ...rest: unknown[]
    ) => {
      // console.log is the spy here, so the write lands in `spyLog.mock.calls`
      console.log(String(chunk).replace(/\n$/, ''));
      const done = rest.find((each) => typeof each === 'function') as
        | (() => void)
        | undefined;
      done?.();
      return true;
    }) as typeof process.stdout.write); // .note = a test double for one overloaded node signature
  });

  afterAll(() => {
    spyWrite?.mockRestore();
  });

  return spyLog;
};
