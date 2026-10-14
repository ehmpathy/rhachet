import { asErrorClassText } from '@src/utils/asErrorClassText';

/**
 * .what = the row of one enrolled actor in the `🧢 apply hooks to enrolled actors` tree
 * .why = a derivation that faulted must read as a fault, never as a quiet actor with no
 *   change. the row takes the shape the brain rows use in `🪝 apply hooks to brains`: a `✗`
 *   marker and the error's class, read off the error rather than asserted over it
 *
 * .note = the actor exid is rendered WHOLE — it is the actor's entire name and a copyable
 *   `@<exid>` address (`define.address-sigils`)
 */
export const asEnrolledActorHookSyncRow = (input: {
  actorExid: string;
  outcome: { changes: string } | { error: unknown };
}): string => {
  if ('error' in input.outcome)
    return `✗ ${input.actorExid}: ${asErrorClassText({ error: input.outcome.error })}`;
  const { changes } = input.outcome;
  return `${input.actorExid}${changes ? `: ${changes}` : ''}`;
};
