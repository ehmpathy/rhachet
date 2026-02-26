import { BadRequestError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findsertPrepareWithPrepareRhachetEntry } from './prep/findsertPrepareWithPrepareRhachetEntry';
import { getPrepareCommand } from './prep/getPrepareCommand';
import { upsertPrepareRhachetEntry } from './prep/upsertPrepareRhachetEntry';

/**
 * .what = persist rhachet init command to package.json prepare entries
 * .why = enables auto-setup on npm install for teammates
 */
export const persistPrepareEntries = (
  input: {
    hooks: boolean;
    roles: string[];
  },
  context: ContextCli,
): {
  prepareRhachet: { effect: 'CREATED' | 'UPDATED' };
  prepare: { effect: 'CREATED' | 'APPENDED' | 'FOUND' };
} => {
  // derive package.json path
  const pkgPath = join(context.cwd, 'package.json');

  // check file exists
  if (!existsSync(pkgPath)) {
    throw new BadRequestError('no package.json found', {
      cwd: context.cwd,
      pkgPath,
    });
  }

  // read package.json
  const pkgContent = readFileSync(pkgPath, 'utf-8');

  // parse package.json
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(pkgContent) as Record<string, unknown>;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new BadRequestError('invalid package.json', {
      pkgPath,
      parseError: error.message,
    });
  }

  // generate prepare command
  const pkgName = typeof pkg.name === 'string' ? pkg.name : null;
  const prepareCommand = getPrepareCommand({
    hooks: input.hooks,
    roles: input.roles,
    pkgName,
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

  // write package.json back
  writeFileSync(
    pkgPath,
    JSON.stringify(findsertResult.pkg, null, 2) + '\n',
    'utf-8',
  );

  // report feedback
  console.log('');
  console.log('📦 persist prepare entries...');
  console.log(
    `   ${upsertResult.effect === 'CREATED' ? '+' : '↻'} [${upsertResult.effect.toLowerCase()}] scripts["prepare:rhachet"]`,
  );
  console.log(
    `   ${findsertResult.effect === 'CREATED' ? '+' : findsertResult.effect === 'APPENDED' ? '↪' : '○'} [${findsertResult.effect.toLowerCase()}] scripts["prepare"]`,
  );
  console.log('');

  return {
    prepareRhachet: { effect: upsertResult.effect },
    prepare: { effect: findsertResult.effect },
  };
};
