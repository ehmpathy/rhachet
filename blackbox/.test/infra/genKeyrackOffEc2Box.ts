import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { genTestTempRepo } from './genTestTempRepo';
import { invokeRhachetCliBinary } from './invokeRhachetCliBinary';

/**
 * .what = a temp box for a keyrack owner, as a grove off ec2 sees it: keyrack init done, and a
 *         `gh` first on PATH that always fails
 * .why = the shared scene of every github-app blackbox suite; the failed gh proves a piped set
 *        never reaches it. pair with `asKeyrackOffEc2Env`, which puts that gh on PATH
 *
 * .note = `git: false` drops the repo's `.git`, so the dir is the real box: where the commander's
 *         `ssh <box> rhx keyrack set …` lands in $HOME, outside any repo. the dir sits under
 *         os.tmpdir(), so no outer git root is found either
 * .note = `init: false` skips `keyrack init`, the box a commander forgot to prepare
 */
export const genKeyrackOffEc2Box = async (input: {
  owner: string;
  git?: boolean;
  init?: boolean;
}) => {
  // a temp repo, optionally stripped of its git root
  const repo = await genTestTempRepo({ fixture: 'minimal' });
  if (input.git === false)
    rmSync(join(repo.path, '.git'), { recursive: true, force: true });

  // keyrack init for the owner, unless the box is meant to be unprepared
  if (input.init !== false)
    invokeRhachetCliBinary({
      args: ['keyrack', 'init', '--owner', input.owner],
      cwd: repo.path,
      env: { HOME: repo.path },
      logOnError: false,
    });

  // a gh that always fails, so a call to it shows as exit 97
  const ghDir = join(repo.path, '.gh-fails');
  mkdirSync(ghDir, { recursive: true });
  writeFileSync(
    join(ghDir, 'gh'),
    [
      '#!/usr/bin/env bash',
      'echo "gh must not be called on a piped set" >&2',
      'exit 97',
      '',
    ].join('\n'),
    'utf-8',
  );
  chmodSync(join(ghDir, 'gh'), 0o755);
  return repo;
};
