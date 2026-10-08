import { HelpfulError } from 'helpful-errors';

/**
 * .what = whether a thrown value is a fault an actor's hook sync reports beneath its own row
 * .why = an actor's sync writes its brain dir, so a classified error or an fs errno is a fault
 *   of THAT actor, reported and tallied while the sweep continues to the next one. every other
 *   class — a `TypeError`, a non-Error throw — is our defect, and it rethrows to crash loud
 */
export const isActorHookSyncFault = (error: unknown): error is Error => {
  if (error instanceof HelpfulError) return true;

  // duck-typed, never `instanceof Error` — a node fs error comes from another realm under a
  // vm sandbox (jest), where the realm check is false for a genuine errno
  if (typeof error !== 'object' || error === null) return false;
  return typeof (error as { code?: unknown }).code === 'string';
};
