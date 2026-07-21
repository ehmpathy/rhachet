import type { getClassifiedRoleTokens } from './getClassifiedRoleTokens';

/**
 * .what = the plain role slugs that downstream flags (--keys, --prep) act on
 * .why = those flags operate on bare slugs, never the sigiled +/- tokens;
 *   this picks the right slug list for each classification mode so the
 *   invokeInit orchestrator stays declarative
 */
export const getRoleSlugsForFlags = (input: {
  classified: ReturnType<typeof getClassifiedRoleTokens> | null;
}): string[] => {
  const { classified } = input;
  if (classified === null) return [];
  if (classified.mode === 'absolute') return classified.absolutes;
  return classified.additions;
};
