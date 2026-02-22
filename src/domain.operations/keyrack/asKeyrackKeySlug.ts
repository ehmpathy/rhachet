import { BadRequestError } from 'helpful-errors';

import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import { asKeyrackKeyName } from './asKeyrackKeyName';

/**
 * .what = detect if a string is a full slug (org.env.key) or raw key name
 * .why = cli accepts both formats; need to know which to resolve
 */
const isFullSlug = (input: {
  key: string;
  manifest: KeyrackRepoManifest;
}): boolean => {
  // check if the key matches any slug in the manifest exactly
  if (input.manifest.keys[input.key]) return true;

  // check if it has the org.env.key pattern (at least 2 dots with org prefix)
  const parts = input.key.split('.');
  if (parts.length >= 3 && parts[0] === input.manifest.org) return true;

  return false;
};

/**
 * .what = find all envs that contain a given raw key name
 * .why = need to know if key is unique to one env or ambiguous
 */
const findEnvsForKey = (input: {
  keyName: string;
  manifest: KeyrackRepoManifest;
}): string[] => {
  const envs: string[] = [];

  for (const [slug, keySpec] of Object.entries(input.manifest.keys)) {
    const name = asKeyrackKeyName({ slug });
    if (name === input.keyName) {
      envs.push(keySpec.env);
    }
  }

  // dedupe (same key might appear once per env, which is expected)
  return [...new Set(envs)];
};

/**
 * .what = resolve a key input (raw name or full slug) to a full slug
 * .why = cli allows users to pass either format; need canonical slug for grant
 *
 * resolution rules:
 * - if input is already a full slug, return as-is
 * - if input is a raw key name and --env provided, construct slug
 * - if input is a raw key name and key only in one env, infer that env
 * - if input is a raw key name and key in multiple envs, fail fast
 * - if input is a raw key name and key not in any env, return as-is (let downstream fail)
 */
export const asKeyrackKeySlug = (input: {
  key: string;
  env: string | null;
  manifest: KeyrackRepoManifest | null;
}): { slug: string; env: string | null } => {
  // if no manifest, can't resolve - return as-is
  if (!input.manifest) {
    return { slug: input.key, env: input.env };
  }

  // if already a full slug, return as-is
  if (isFullSlug({ key: input.key, manifest: input.manifest })) {
    return { slug: input.key, env: input.env };
  }

  // it's a raw key name - need to resolve to full slug
  const keyName = input.key;
  const org = input.manifest.org;

  // if --env provided, construct slug directly
  if (input.env) {
    return {
      slug: `${org}.${input.env}.${keyName}`,
      env: input.env,
    };
  }

  // no --env provided - try to infer from manifest
  const envs = findEnvsForKey({ keyName, manifest: input.manifest });

  // key not in any env - return as-is (let downstream fail with good message)
  if (envs.length === 0) {
    return { slug: input.key, env: null };
  }

  // key in exactly one env - infer it
  if (envs.length === 1) {
    const inferredEnv = envs[0]!;
    return {
      slug: `${org}.${inferredEnv}.${keyName}`,
      env: inferredEnv,
    };
  }

  // key in multiple envs - ambiguous, fail fast
  throw new BadRequestError(
    `key '${keyName}' found in multiple envs: ${envs.join(', ')}. specify --env to disambiguate.`,
  );
};
