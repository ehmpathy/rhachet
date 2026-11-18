import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HOOK_DISPATCH_RHX_SHORT_CIRCUITS,
  HOOK_DISPATCH_RUN_FLAGS,
} from './constants';

/**
 * .what = the repo root, whose `bin/rhx` and `invokeRun.ts` own the tables the sync copies
 */
const REPO_ROOT = join(__dirname, '../../../..');

describe('hook dispatch route tables, against the files that own them', () => {
  test('the rhx short circuits are the bare first words `bin/rhx` sends past the skill proxy', () => {
    const text = readFileSync(join(REPO_ROOT, 'bin/rhx'), 'utf-8');
    const sent = [...text.matchAll(/\[ "\$1" = "([a-z]+)" \]/g)].map(
      (match) => match[1]!,
    );
    expect([...new Set(sent)].sort()).toEqual(
      [...HOOK_DISPATCH_RHX_SHORT_CIRCUITS].sort(),
    );
  });

  test('the run flags are every flag `rhachet run` declares', () => {
    const text = readFileSync(
      join(REPO_ROOT, 'src/contract/cli/invokeRun.ts'),
      'utf-8',
    );
    const declared = [...text.matchAll(/\.option\('([^']+)'/g)].flatMap(
      (match) =>
        match[1]!.split(/[ ,]+/).filter((word) => word.startsWith('-')),
    );
    expect([...new Set(declared)].sort()).toEqual(
      [...HOOK_DISPATCH_RUN_FLAGS].sort(),
    );
  });
});
