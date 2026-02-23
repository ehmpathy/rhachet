/**
 * .what = findsert npm run prepare:rhachet into prepare entry
 * .why = prepare entry preserves extant logic, appends if needed
 */
export const findsertPrepareWithPrepareRhachetEntry = (input: {
  pkg: Record<string, unknown>;
}): {
  pkg: Record<string, unknown>;
  effect: 'CREATED' | 'APPENDED' | 'FOUND';
} => {
  const append = 'npm run prepare:rhachet';
  const separator = ' && ';

  // ensure scripts object extant
  const scripts = (input.pkg.scripts ?? {}) as Record<string, string>;
  const extant = scripts.prepare;

  // if prepare absent → create with append value
  if (extant === undefined) {
    scripts.prepare = append;
    return {
      pkg: { ...input.pkg, scripts },
      effect: 'CREATED',
    };
  }

  // if prepare extant and already includes append → no-op
  if (extant.includes(append)) {
    return {
      pkg: input.pkg,
      effect: 'FOUND',
    };
  }

  // if prepare extant but lacks append → append with separator
  scripts.prepare = `${extant}${separator}${append}`;
  return {
    pkg: { ...input.pkg, scripts },
    effect: 'APPENDED',
  };
};
