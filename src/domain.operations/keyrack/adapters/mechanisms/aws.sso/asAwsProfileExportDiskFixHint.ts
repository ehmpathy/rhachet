/**
 * .what = the disk fault codes a move cures, each with the entry it names: an entry of the wrong
 *   kind at the path, or a file above it
 * .why = node's `rm` reports a dir as ERR_FS_EISDIR, not EISDIR, so both are listed
 */
const WRONG_KIND_ENTRY: Record<string, (path: string) => string> = {
  EEXIST: (path) => `the file at ${path}`,
  ENOTDIR: (path) => `the file that sits on the way to ${path}`,
  EISDIR: (path) => `the dir at ${path}`,
  ERR_FS_EISDIR: (path) => `the dir at ${path}`,
};

/**
 * .what = the fix a human reads for a cache disk fault: the cure, the path once, the disk's code
 * .why = a wrong-kind entry is cured by a move, a refused one by a mode change; the hint names
 *   the one that fits. the disk's full message rides in the error's own `diskError` field, so the
 *   hint carries only its code and never repeats the path the message already names
 * .note = an error with no code (another realm, a bare string) falls back to its text
 */
export const asAwsProfileExportDiskFixHint = (input: {
  path: string;
  error: unknown;
}): string => {
  const code = (input.error as { code?: unknown })?.code;
  const diskSaid =
    typeof code === 'string' && code
      ? code
      : String((input.error as { message?: unknown })?.message ?? input.error);

  // a wrong-kind entry: a move cures it, and the hint names which entry
  const asEntry = WRONG_KIND_ENTRY[String(code)];
  if (asEntry)
    return `move aside ${asEntry(input.path)}, then retry; the disk said ${diskSaid}`;

  // a refused entry: a mode change cures it
  return `make ${input.path} readable and writable by this user (a \`sudo rhx\` may have left it root-owned), then retry; the disk said ${diskSaid}`;
};
