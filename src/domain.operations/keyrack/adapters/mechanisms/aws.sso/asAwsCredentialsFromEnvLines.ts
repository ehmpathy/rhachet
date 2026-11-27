/**
 * .what = the `KEY=value` pairs of an `aws configure export-credentials --format env-no-export` reply
 * .why = the cli replies in shell-env lines, not json; one named cast keeps the read of
 *        that shape in one place, and lets a test pin it
 *
 * .note = a line that is no `KEY=value` pair (a blank, a warn) is skipped, never thrown
 * .note = the value keeps every `=` past the first, so a base64 token survives whole
 */
export const asAwsCredentialsFromEnvLines = (input: {
  stdout: string;
}): Record<string, string> =>
  Object.fromEntries(
    input.stdout
      .trim()
      .split('\n')
      .map((line) => line.match(/^([A-Z_]+)=(.*)$/))
      .filter((match): match is RegExpMatchArray => match !== null)
      .map((match) => [match[1]!, match[2] ?? '']),
  );
