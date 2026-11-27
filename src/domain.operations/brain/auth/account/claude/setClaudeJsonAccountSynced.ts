import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';
import { getFileContentOrNull } from '@src/infra/filesystem/getFileContentOrNull';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { join } from 'node:path';
import { asClaudeJsonAccountSynced } from './asClaudeJsonAccountSynced';
import { getOneClaudeJsonAccountClaimed } from './getOneClaudeJsonAccountClaimed';

/**
 * .what = rename the cli's own `~/.claude.json` record to the account the grove holds; write only
 *   when the record names another
 * .why = `get` reads it when the live token has lapsed (case=5 [t3]), and the claude ui shows it.
 *   a `use` runs it on `unchanged` too, so a sync that faulted once is repaired on the retry
 */
export const setClaudeJsonAccountSynced = (input: {
  home: string;
  account: BrainAuthAccount;
}): { effect: 'synced' | 'unchanged' | 'absent' } => {
  // a record that already names this account is left byte for byte
  const claimed = getOneClaudeJsonAccountClaimed({ home: input.home });
  if (claimed?.email === input.account.email) return { effect: 'unchanged' };

  // rename the record; no file, or one that does not parse, is left alone
  const path = join(input.home, '.claude.json');
  const synced = asClaudeJsonAccountSynced({
    content: getFileContentOrNull({ path }),
    account: input.account,
  });
  if (synced === null) return { effect: 'absent' };
  setFileAtomic({ path, content: synced }, { mode: 0o600 });
  return { effect: 'synced' };
};
