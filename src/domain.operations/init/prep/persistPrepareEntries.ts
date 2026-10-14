import { ConstraintError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

import { join } from 'node:path';
import { findsertPrepareWithPrepareRhachetEntry } from './findsertPrepareWithPrepareRhachetEntry';
import { getOnePackageJsonOrNull } from './getOnePackageJsonOrNull';
import { getPrepareCommand } from './getPrepareCommand';
import { setOnePackageJson } from './setOnePackageJson';
import { upsertPrepareRhachetEntry } from './upsertPrepareRhachetEntry';

/**
 * .what = the report glyph for each effect a prepare entry can take
 */
const PREPARE_EFFECT_GLYPH: Record<
  'CREATED' | 'UPDATED' | 'APPENDED' | 'FOUND',
  string
> = {
  CREATED: '+',
  UPDATED: '↻',
  APPENDED: '↪',
  FOUND: '○',
};

/**
 * .what = persist rhachet init command to package.json prepare entries
 * .why = enables auto-setup on npm install for teammates
 *
 * .note = the read and the write hold the `package.json` mutex, so a peer `rhx init` that
 *   writes the same file cannot drop this one's entries
 */
export const persistPrepareEntries = async (
  input: {
    hooks: boolean;
    roles: string[];
  },
  context: ContextCli,
): Promise<{
  prepareRhachet: { effect: 'CREATED' | 'UPDATED' };
  prepare: { effect: 'CREATED' | 'APPENDED' | 'FOUND' };
}> => {
  const pkgPath = join(context.cwd, 'package.json');
  const result = await withRepoMutex(
    { repoPath: context.cwd, path: pkgPath },
    async () => persistPrepareEntriesWithinLock(input, context),
  );

  // report feedback
  console.log('');
  console.log('📦 persist prepare entries...');
  console.log(
    `   ${PREPARE_EFFECT_GLYPH[result.prepareRhachet.effect]} [${result.prepareRhachet.effect.toLowerCase()}] scripts["prepare:rhachet"]`,
  );
  console.log(
    `   ${PREPARE_EFFECT_GLYPH[result.prepare.effect]} [${result.prepare.effect.toLowerCase()}] scripts["prepare"]`,
  );
  console.log('');

  return result;
};

/**
 * .what = the read, the two entry edits and the write, once the `package.json` mutex is held
 */
const persistPrepareEntriesWithinLock = (
  input: {
    hooks: boolean;
    roles: string[];
  },
  context: ContextCli,
): {
  prepareRhachet: { effect: 'CREATED' | 'UPDATED' };
  prepare: { effect: 'CREATED' | 'APPENDED' | 'FOUND' };
} => {
  // read package.json; --prep needs one to write into
  const found = getOnePackageJsonOrNull({ dir: context.cwd });
  if (!found)
    throw new ConstraintError('no package.json found', {
      cwd: context.cwd,
      pkgPath: join(context.cwd, 'package.json'),
    });
  const { pkgPath, pkg } = found;

  // generate prepare command
  const pkgName = typeof pkg.name === 'string' ? pkg.name : null;
  const devDependencies =
    typeof pkg.devDependencies === 'object' && pkg.devDependencies !== null
      ? (pkg.devDependencies as Record<string, string>)
      : null;
  const prepareCommand = getPrepareCommand({
    hooks: input.hooks,
    roles: input.roles,
    pkgName,
    devDependencies,
  });

  // upsert prepare:rhachet entry
  const upsertResult = upsertPrepareRhachetEntry({
    pkg,
    value: prepareCommand,
  });

  // findsert npm run prepare:rhachet into prepare entry
  const findsertResult = findsertPrepareWithPrepareRhachetEntry({
    pkg: upsertResult.pkg,
  });

  // write package.json back, whole
  setOnePackageJson({ pkgPath, pkg: findsertResult.pkg });

  return {
    prepareRhachet: { effect: upsertResult.effect },
    prepare: { effect: findsertResult.effect },
  };
};
