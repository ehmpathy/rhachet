import { ConstraintError } from 'helpful-errors';

/**
 * .what = every span of a text that names one machine: its home dir, its username as a path
 *         segment, its hostname in a host position, or any `/home/<x>`, `/Users/<x>`, `/root`
 *         path, bare or with a tail
 * .why = committed config must name no machine (rule.forbid.machine-names-in-committed-config).
 *        a test scans what a writer wrote, under the real machine, and asserts `[]`, so a
 *        regression fails a test before it can reach git
 *
 * .note = the shape scan catches a home from ANOTHER machine (`/home/camper/`), which the
 *   machine's own home, user and host cannot; a glob segment (`**`, `*`, `!(…)`) is never a home
 * .note = a windows path is read as posix: each run of `\` (json doubles them) becomes `/`, so
 *   `C:\\Users\\x\\` meets the same `/Users/<x>/` shape
 * .note = test-only by design: the writer performs no machine-name check (fulcrum F3)
 */
export const getAllMachineNamesInText = (input: {
  text: string;
  machine: { home: string; username: string; hostname: string };
}): string[] => {
  const text = asPosixSlashes(input.text);
  const machine = { ...input.machine, home: asPosixSlashes(input.machine.home) };

  // reject an empty machine name: every text contains '', so the scan would report noise
  const namesEmpty = Object.entries(machine)
    .filter(([, value]) => value.trim() === '')
    .map(([key]) => key);
  if (namesEmpty.length > 0)
    throw new ConstraintError('a machine name to scan for is empty', {
      namesEmpty,
      hint: 'pass the real home, username and hostname — os.homedir(), os.userInfo().username, os.hostname()',
    });

  // the machine's own home, on a path boundary; a home of one segment or fewer (`/`, `/root`)
  //   would match unrelated paths, so it is left to the shape scan
  const homeSegments = machine.home.split('/').filter((part) => part !== '');
  const homeFound =
    homeSegments.length >= 2 &&
    new RegExp(`${asRegexLiteral(machine.home)}(?=/|"|\\s|$)`, 'm').test(text)
      ? [machine.home]
      : [];

  // the username as one whole path segment
  const userFound = [
    ...text.matchAll(
      new RegExp(`/${asRegexLiteral(machine.username)}(?=/|"|$)`, 'gm'),
    ),
  ].map((match) => match[0]);

  // the hostname in a host position: after `//` or `@`, or as the left label of a qualified
  //   name; a bare word is no host, so a box named `test` never flags `npm run test`
  const host = asRegexLiteral(machine.hostname);
  const hostFound = [
    ...text.matchAll(
      new RegExp(
        `(?<=//|@)${host}(?![A-Za-z0-9_-])|(?<![A-Za-z0-9_.-])${host}(?=\\.[A-Za-z])`,
        'g',
      ),
    ),
  ].map((match) => match[0]);

  // any home-shaped path, of this machine or another — bare (`/home/x`) or with a tail
  const shapeFound = [
    ...text.matchAll(
      /\/(?:home|Users)\/[^/"\s*?{}[\]!()]+(?:\/|(?=["\s]|$))|\/root(?:\/|(?=["\s]|$))/gm,
    ),
  ].map((match) => match[0]);

  return [
    ...new Set([...homeFound, ...userFound, ...hostFound, ...shapeFound]),
  ].sort();
};

/**
 * .what = a text with each run of backslashes turned to one `/`
 * .why = a windows home is written with `\`, and json escapes each one as `\\`; one run, one
 *        separator, so both spellings meet the posix shape scan
 */
const asPosixSlashes = (input: string): string => input.replace(/\\+/g, '/');

/**
 * .what = a string, escaped so a RegExp reads it literally
 * .why = a hostname carries `.` and a username may carry `-` or `+`; unescaped, a `.` would match
 *        any char and report a span that names no machine
 */
const asRegexLiteral = (input: string): string =>
  input.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
