/**
 * .what = the per-payload flags `roles cost` accepts, which the `--all` sweep never honors
 */
export const FLAGS_PER_PAYLOAD = [
  { key: 'role', flag: '--role' },
  { key: 'repo', flag: '--repo' },
  { key: 'what', flag: '--what' },
  { key: 'subject', flag: '--subject' },
  { key: 'top', flag: '--top' },
  { key: 'ifPresent', flag: '--if-present' },
] as const;

/**
 * .what = the per-payload flags a caller passed beside `--all`
 * .why = the sweep takes no input at all, so each flag here would be dropped in silence
 */
export const getAllFlagsRefusedBesideAll = (input: {
  opts: {
    role?: string;
    repo?: string;
    what?: string;
    subject?: string[];
    top?: string;
    ifPresent?: boolean;
  };
}): string[] =>
  FLAGS_PER_PAYLOAD.filter(({ key }) => input.opts[key] !== undefined).map(
    ({ flag }) => flag,
  );
