import { MalfunctionError } from 'helpful-errors';

/**
 * .what = the manifest path a dispatcher command names: `bash <bin> <manifest> <event>`
 * .why = a command of any other shape would hide which manifest runs, so a reader fails loud on
 *   it, never reads it as a manifest with no rules
 * .note = the parse of what `asHookDispatcherCommand` builds; a round-trip test holds the pair
 */
export const asManifestPathOfHookDispatcherCommand = (input: {
  command: string;
}): string => {
  const words = input.command.trim().split(/\s+/);
  const isShape =
    words.length === 4 &&
    words[0] === 'bash' &&
    words[1]!.endsWith('/hooks.dispatch.sh');
  if (!isShape)
    throw new MalfunctionError(
      'a dispatcher hook command has an unknown shape',
      {
        command: input.command,
        shape: 'bash <bin>/hooks.dispatch.sh <manifest> <event>',
        hint: 'run `rhx init --hooks` to rewrite each dispatcher hook',
      },
    );
  return words[2]!;
};
