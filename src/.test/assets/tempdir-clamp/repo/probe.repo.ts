import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { genTestTempRepo } from '../../../../../blackbox/.test/infra/genTestTempRepo';
import { getProbeSlug } from '../getProbeSlug';

/**
 * .what = a probe for the autoprune clamp; never part of a normal suite
 * .why = it allocates via genTestTempRepo — the lane-A allocator behind ~432 blackbox calls,
 *        the population the leak came from — so the clamp measures that allocator itself,
 *        under the integration config, rather than a synthetic stand-in
 */
test('repo allocates two temp test repos', async () => {
  const slug = getProbeSlug();
  const repos = [
    await genTestTempRepo({ fixture: 'minimal', suffix: slug }),
    await genTestTempRepo({ fixture: 'minimal', suffix: slug }),
  ];
  expect(repos.every((repo) => existsSync(join(repo.path, '.git')))).toBe(true);

  // each repo carries a repo-LOCAL git identity, so a commit inside it never leans on the host's
  const identities = repos.map((repo) =>
    ['user.name', 'user.email'].map((key) =>
      execSync(`git config --local ${key}`, { cwd: repo.path })
        .toString()
        .trim(),
    ),
  );
  expect(identities.flat().every((value) => value.length > 0)).toBe(true);
});
