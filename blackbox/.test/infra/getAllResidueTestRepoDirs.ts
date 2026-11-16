import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the name of each dir in the os temp root that is a test repo an earlier run minted there
 * .why = the name alone is not enough — a few unit tests still mint `rhachet-test-*` dirs of their
 *   own — so the test ssh key every such repo carried is the signature
 */
export const getAllResidueTestRepoDirs = (input: { tmpRoot: string }): string[] =>
  readdirSync(input.tmpRoot)
    .filter((name) => name.startsWith('rhachet-test-'))
    .filter((name) => existsSync(join(input.tmpRoot, name, '.ssh', 'id_ed25519')));
