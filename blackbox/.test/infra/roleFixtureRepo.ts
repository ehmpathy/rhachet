import { execSync } from 'node:child_process';
import { existsSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * .what = builds a git repo fixture with real rhachet-roles-* packages linkable
 * .why = incremental --roles (and the rhx init alias) must be exercised end-to-end
 *        through the built CLI binary (subprocess), since the `-role` argv
 *        preprocess and the bin/rhx alias rewrite live in the entry layer
 *
 * .note = writes a package.json that declares the role packages so
 *   discoverRolePackages finds them, and symlinks node_modules so their
 *   manifests are readable
 */
export const setupRoleFixtureRepo = (input: { dir: string }): void => {
  // init a git repo only when one is absent — failfast on any real git error,
  // never swallow it (a swallowed init failure would leave an invalid fixture)
  if (!existsSync(resolve(input.dir, '.git')))
    execSync('git init', { cwd: input.dir, stdio: 'pipe' });
  // declare the role packages as dependencies (discoverRolePackages reads these)
  writeFileSync(
    resolve(input.dir, 'package.json'),
    JSON.stringify(
      {
        name: 'fixture-repo',
        version: '0.0.0',
        // org lets `init --keys` detect a keyrack org (getOrgFromPackageJson);
        // harmless for incremental tests that never trigger the keys path
        organization: 'ehmpathy',
        dependencies: {
          'rhachet-roles-ehmpathy': '*',
          'rhachet-roles-bhuild': '*',
          'rhachet-roles-bhrain': '*',
        },
      },
      null,
      2,
    ),
  );
  // symlink node_modules so rhachet-roles-* packages are discoverable
  const nodeModulesLink = join(input.dir, 'node_modules');
  const nodeModulesTarget = resolve(__dirname, '../../..', 'node_modules');
  if (!existsSync(nodeModulesLink))
    symlinkSync(nodeModulesTarget, nodeModulesLink, 'dir');
};

/**
 * .what = checks whether a role slug is linked under any non-native repo
 * .why = acceptance tests assert the enrolled set by the presence of the
 *        `.agent/repo=<repo>/role=<slug>` symlink tree the CLI writes
 */
export const isRoleLinked = (input: { dir: string; role: string }): boolean => {
  const agentDir = resolve(input.dir, '.agent');
  if (!existsSync(agentDir)) return false;
  return readdirSync(agentDir)
    .filter((e) => e.startsWith('repo=') && e !== 'repo=.this')
    .some((repoEntry) =>
      existsSync(resolve(agentDir, repoEntry, `role=${input.role}`)),
    );
};
