import { BadRequestError } from 'helpful-errors';

import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import { asKeyrackKeyName } from './asKeyrackKeyName';
import { isValidKeyrackEnv } from './constants';

/**
 * .what = detect if a string is a full slug (org.env.key) or raw key name
 * .why = cli accepts both formats; need to know which to extract
 *
 * .note = returns parsed parts if full slug, null if raw key
 */
const parseFullSlug = (input: {
  key: string;
}): { org: string; env: string; keyName: string } | null => {
  const parts = input.key.split('.');
  if (parts.length < 3) return null;

  const org = parts[0]!;
  const env = parts[1]!;
  const keyName = parts.slice(2).join('.');

  // must have valid env to be a full slug
  if (!isValidKeyrackEnv(env)) return null;

  return { org, env, keyName };
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
 * .what = convert key input (raw name or full slug) to canonical slug + env
 * .why = cli accepts both formats; need to extract env and validate org
 *
 * rules:
 * - full slug: extract env, validate org matches manifest
 * - raw key with --env: construct slug from manifest.org + env + key
 * - raw key, no --env, unique env: infer env
 * - raw key, no --env, multiple envs: fail fast
 * - raw key, no --env, zero envs: passthrough (downstream fails)
 */
export const asKeyrackKeySlug = (input: {
  key: string;
  env: string | null;
  manifest: KeyrackRepoManifest;
}): { slug: string; env: string } => {
  const org = input.manifest.org;

  // check if full slug format
  const parsed = parseFullSlug({ key: input.key });

  if (parsed) {
    // validate org matches manifest
    if (parsed.org !== org) {
      throw new BadRequestError(
        `slug org '${parsed.org}' does not match manifest org '${org}'`,
        { code: 'ORG_MISMATCH', slugOrg: parsed.org, manifestOrg: org },
      );
    }

    // validate --env matches slug env (if both provided)
    if (input.env && input.env !== parsed.env) {
      throw new BadRequestError(
        `--env '${input.env}' conflicts with slug env '${parsed.env}'`,
        { code: 'ENV_CONFLICT', flagEnv: input.env, slugEnv: parsed.env },
      );
    }

    return { slug: input.key, env: parsed.env };
  }

  // raw key name - construct slug
  const keyName = input.key;

  // if --env provided, construct slug directly
  if (input.env) {
    return {
      slug: `${org}.${input.env}.${keyName}`,
      env: input.env,
    };
  }

  // no --env provided - try to infer from manifest
  const envs = findEnvsForKey({ keyName, manifest: input.manifest });

  // key not in any env - fail fast with clear message
  if (envs.length === 0) {
    throw new BadRequestError(
      `key '${keyName}' not found in manifest. specify --env or use full slug.`,
      { code: 'KEY_NOT_FOUND', keyName },
    );
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
    { code: 'AMBIGUOUS_KEY', keyName, envs },
  );
};
