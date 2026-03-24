/**
 * .what = captures stdout (console.log + process.stdout.write) for test assertions
 * .why = enables snapshot tests of CLI output without per-test spy boilerplate
 *
 * .note = captures both console.log (high-level) and process.stdout.write (low-level)
 * .note = restores original functions after fn completes
 */
export const withSpyOnStdout = async <T>(
  fn: () => Promise<T>,
): Promise<{ result: T; stdout: string }> => {
  const captured: string[] = [];

  // spy on console.log
  const originalConsoleLog = console.log;
  console.log = (...args: unknown[]) => {
    captured.push(args.map(String).join(' '));
  };

  // spy on process.stdout.write
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    const str = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
    captured.push(str);
    return true;
  }) as typeof process.stdout.write;

  try {
    const result = await fn();
    return { result, stdout: captured.join('\n') };
  } finally {
    console.log = originalConsoleLog;
    process.stdout.write = originalWrite;
  }
};
