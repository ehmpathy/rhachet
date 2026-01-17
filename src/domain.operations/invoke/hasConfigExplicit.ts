import type { ContextCli } from '@src/domain.objects/ContextCli';

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = checks if rhachet.use.ts config file exists
 * .why = enables fallback to getRoleRegistriesByConfigImplicit when config absent
 */
export const hasConfigExplicit = (context: ContextCli): boolean => {
  const configPath = resolve(context.gitroot, 'rhachet.use.ts');
  return existsSync(configPath);
};
