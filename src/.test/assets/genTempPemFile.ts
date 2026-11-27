import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { genTempDirPhysical } from '@src/.test/infra/genTempDirPhysical';

import { asTestKeyBegin } from './asTestKeyText';

/**
 * .what = write a throwaway pem file to a temp dir and return its path + content
 * .why = several integration tests read a real pem off disk (the fs communicator);
 *        this shared fixture keeps that setup in one place so updates propagate
 *
 * .note = content defaults to a fake pem; pass `content` to assert on exact bytes
 */
export const genTempPemFile = (input?: {
  content?: string;
}): { path: string; content: string } => {
  const content =
    input?.content ?? `${asTestKeyBegin({ kind: 'RSA' })}\nfake-pem\n`;
  const dir = genTempDirPhysical({ slug: 'pem-fixture' });
  const path = join(dir, 'app.pem');
  writeFileSync(path, content, 'utf-8');
  return { path, content };
};
