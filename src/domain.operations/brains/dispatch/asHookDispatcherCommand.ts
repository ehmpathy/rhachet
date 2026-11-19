import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { HOOK_DISPATCH } from './constants';

/**
 * .what = the characters a dispatcher command word may hold: a shell reads them as one plain word
 * .why = the command is written unquoted, so a space or a shell character in a path or an event
 *   would split or expand it at run; such a value is refused here, at sync, never at the call
 */
const WORD_PLAIN = /^[A-Za-z0-9_\-./=+@:,]+$/;

/**
 * .what = the shell command claude runs for one event's dispatcher:
 *   `bash <bin> <manifest> <event>`
 * .why = one builder, beside its one parser (`asManifestPathOfHookDispatcherCommand`), so the two
 *   cannot drift; a round-trip test holds them together
 */
export const asHookDispatcherCommand = (input: {
  manifestPathRel: string;
  event: string;
}): string => {
  // the event comes from the brain supplier's event map, never from the human; an unplain one is
  //   the supplier's defect, so it names the supplier, not a rename the human cannot make
  if (!WORD_PLAIN.test(input.event))
    throw new MalfunctionError(
      'a hook dispatcher event holds a character the shell would split or expand',
      {
        manifestPathRel: input.manifestPathRel,
        event: input.event,
        hint: 'the brain supplier mapped a hook to this event name; upgrade or report the brain supplier package (e.g. rhachet-brains-anthropic)',
      },
    );

  // the manifest path is the actor dir, relative to the repo; it must stay one plain word, unquoted
  if (!WORD_PLAIN.test(input.manifestPathRel))
    throw new ConstraintError(
      'a hook dispatcher manifest path holds a character the shell would split or expand',
      {
        manifestPathRel: input.manifestPathRel,
        event: input.event,
        hint: 'the manifest path is the actor dir, relative to the repo; rename the actor (its slug in actors.yml) to plain characters (letters, digits, `_-./=+@:,`), then rerun `rhx init --hooks`',
      },
    );

  return `bash ${HOOK_DISPATCH.bin} ${input.manifestPathRel} ${input.event}`;
};
