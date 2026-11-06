/**
 * .what = set one process env var, or delete it when the value is undefined
 * .why = `process.env.X = undefined` stores the string "undefined", so a test that restores a
 *        var that was unset would leave a bogus value behind for every later step
 * .note = deliberate mutation: process.env is the one lever a test has over a read of it
 */
export const setProcessEnvVar = (input: {
  name: string;
  value: string | undefined;
}): void => {
  if (input.value === undefined) {
    delete process.env[input.name];
    return;
  }
  process.env[input.name] = input.value;
};
