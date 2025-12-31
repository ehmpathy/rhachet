import { resolve } from 'path';

/**
 * .what = exports paths to example repo test assets
 * .why = provides portable, type-safe references for integration tests
 */

export const EXAMPLE_REPO_DIR = __dirname;

export const EXAMPLE_REPO_COLLOCATED = resolve(
  EXAMPLE_REPO_DIR,
  'rhachet-roles-example.collocated',
);

export const EXAMPLE_REPO_PUBLISHED = resolve(
  EXAMPLE_REPO_DIR,
  'rhachet-roles-example.published',
);

export const EXAMPLE_REPO_WITH_RIGID_SKILL = resolve(
  EXAMPLE_REPO_DIR,
  'repo-with-role-with-rigid-skill',
);
