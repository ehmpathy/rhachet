/**
 * .what = upsert prepare:rhachet into package.json scripts
 * .why = prepare:rhachet always overwrites (upsert semantics)
 */
export const upsertPrepareRhachetEntry = (input: {
  pkg: Record<string, unknown>;
  value: string;
}): {
  pkg: Record<string, unknown>;
  effect: 'CREATED' | 'UPDATED';
} => {
  // ensure scripts object extant
  const scripts = (input.pkg.scripts ?? {}) as Record<string, string>;
  const extant = scripts['prepare:rhachet'] !== undefined;

  // set the value
  scripts['prepare:rhachet'] = input.value;

  return {
    pkg: { ...input.pkg, scripts },
    effect: extant ? 'UPDATED' : 'CREATED',
  };
};
