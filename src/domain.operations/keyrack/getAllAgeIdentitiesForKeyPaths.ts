import { getOneAgeIdentityOrNull } from '@src/domain.operations/keyrack/getOneAgeIdentityOrNull';

/**
 * .what = convert a list of ssh private-key paths to their age identities, minus per-key misses
 * .why = keeps the array-shape work (map-then-drop-nulls) out of orchestrators so each caller reads
 *        as one narrative line instead of an inline promise-all/filter pipeline
 *
 * .note = getOneAgeIdentityOrNull skips a per-key parse miss but rethrows a broken crypto load (e6),
 *         so a genuine crypto malfunction propagates loud rather than a quietly smaller identity pool
 * .note = `getOne` is an OPTIONAL injected per-key getter (dependency injection); it defaults to the
 *         real `getOneAgeIdentityOrNull`. the unit test injects a fake to exercise the map-then-drop
 *         -nulls (and rethrow-propagation) logic WITHOUT a `jest.mock`
 *         (rule.forbid.unit.remote-boundaries).
 */
export const getAllAgeIdentitiesForKeyPaths = async (
  input: {
    keyPaths: string[];
  },
  context?: {
    getOne?: (input: { keyPath: string }) => Promise<string | null>;
  },
): Promise<string[]> => {
  const getOne = context?.getOne ?? getOneAgeIdentityOrNull;
  const identities = await Promise.all(
    input.keyPaths.map((keyPath) => getOne({ keyPath })),
  );
  return identities.filter((identity): identity is string => identity !== null);
};
