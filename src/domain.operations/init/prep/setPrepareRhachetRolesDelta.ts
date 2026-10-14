import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import { asRecordOrNull } from '@src/infra/asRecordOrNull';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

import { join } from 'node:path';
import { asPrepareRhachetRolesDelta } from './asPrepareRhachetRolesDelta';
import { getOnePackageJsonOrNull } from './getOnePackageJsonOrNull';
import { setOnePackageJson } from './setOnePackageJson';

/**
 * .what = apply an incremental role delta to an extant `prepare:rhachet` entry
 * .why = `rhx init --roles -xyz` must drop `xyz` from the command a fresh install
 *        replays, or the next install links the removed role right back. critical:
 *        inventory.of=requirements.case=1
 *
 * .note = a repo with no `package.json`, or no `prepare:rhachet` entry, is `ABSENT` —
 *   there is no replay to fix, so the call writes naught
 * .note = writes only on a change; an unchanged entry is `FOUND`
 * .note = the read and the write hold the `package.json` mutex, so two `rhx init`s that
 *   remove different roles each land their removal; neither write drops the other's
 */
export const setPrepareRhachetRolesDelta = async (
  input: {
    additions: RoleSpecifier[];
    removals: RoleSpecifier[];
  },
  context: ContextCli,
): Promise<{
  effect: 'ABSENT' | 'FOUND' | 'UPDATED';
  command: { before: string; after: string } | null;
}> => {
  const result = await withRepoMutex(
    { repoPath: context.cwd, path: join(context.cwd, 'package.json') },
    async () => setPrepareRhachetRolesDeltaWithinLock(input, context),
  );

  // report feedback, in the shape persistPrepareEntries uses
  if (result.effect === 'UPDATED' && result.command) {
    console.log('');
    console.log('📦 persist prepare entries...');
    console.log('   ↻ [updated] scripts["prepare:rhachet"]');
    console.log(`      └─ ${result.command.after}`);
    console.log('');
  }

  return result;
};

/**
 * .what = the read, the delta and the write, once the `package.json` mutex is held
 */
const setPrepareRhachetRolesDeltaWithinLock = (
  input: {
    additions: RoleSpecifier[];
    removals: RoleSpecifier[];
  },
  context: ContextCli,
): {
  effect: 'ABSENT' | 'FOUND' | 'UPDATED';
  command: { before: string; after: string } | null;
} => {
  const found = getOnePackageJsonOrNull({ dir: context.cwd });
  if (!found) return { effect: 'ABSENT', command: null };

  const scripts = asRecordOrNull({ value: found.pkg.scripts });
  const before = scripts?.['prepare:rhachet'];
  if (typeof before !== 'string') return { effect: 'ABSENT', command: null };

  const after = asPrepareRhachetRolesDelta({
    command: before,
    additions: input.additions,
    removals: input.removals,
  });
  if (after === before) return { effect: 'FOUND', command: { before, after } };

  const pkgNext = {
    ...found.pkg,
    scripts: { ...scripts, 'prepare:rhachet': after },
  };
  setOnePackageJson({ pkgPath: found.pkgPath, pkg: pkgNext });
  return { effect: 'UPDATED', command: { before, after } };
};
