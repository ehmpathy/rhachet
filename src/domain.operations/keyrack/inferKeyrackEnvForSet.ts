import { BadRequestError } from 'helpful-errors';

import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import { asKeyrackKeyName } from './asKeyrackKeyName';

/**
 * .what = infers env for keyrack set when --env not provided
 * .why = spec requires set to infer env when key in one env, fail-fast when ambiguous
 *
 * @ref .agent/repo=.this/role=keyrack/briefs/spec.key-set-behavior.md
 */
export const inferKeyrackEnvForSet = (input: {
  key: string;
  manifest: KeyrackRepoManifest | null;
}): string => {
  // if no manifest, cannot infer
  if (!input.manifest) {
    throw new BadRequestError(
      `--env required: ${input.key} not found in manifest (no keyrack.yml)`,
      { hint: `specify --env explicitly, e.g.: --env test` },
    );
  }

  // find all envs where this key appears
  // manifest.keys is keyed by slug (org.env.keyName), with spec.env as the env value
  const envsForKey: string[] = [];
  for (const [slug, spec] of Object.entries(input.manifest.keys)) {
    const keyName = asKeyrackKeyName({ slug });
    if (keyName === input.key) {
      // avoid duplicates (same env from multiple slugs, e.g., env.all expansion)
      if (!envsForKey.includes(spec.env)) {
        envsForKey.push(spec.env);
      }
    }
  }

  // not found in manifest
  if (envsForKey.length === 0) {
    throw new BadRequestError(
      `--env required: ${input.key} not found in manifest`,
      { hint: `specify --env explicitly, e.g.: --env test` },
    );
  }

  // if 'all' is in the set, key was declared in env.all → return 'all'
  // (expansion to other envs creates specs with different env, but 'all' means it was in env.all)
  if (envsForKey.includes('all')) {
    return 'all';
  }

  // found in exactly one env
  if (envsForKey.length === 1) {
    return envsForKey[0]!;
  }

  // found in multiple envs (ambiguous)
  throw new BadRequestError(
    `--env required: ${input.key} found in multiple envs: ${envsForKey.join(', ')}`,
    { hint: `specify --env explicitly, e.g.: --env ${envsForKey[0]}` },
  );
};
