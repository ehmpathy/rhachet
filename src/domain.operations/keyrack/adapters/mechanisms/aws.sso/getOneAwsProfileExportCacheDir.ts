import { getHomeDir } from '@src/infra/getHomeDir';

import { join } from 'node:path';

/**
 * .what = the dir that holds every cached aws export on this box
 * .why = the writer (`genAwsProfileExport`) and the dropper (`delAwsProfileExport`) must meet on
 *   one dir, so it is named in one place
 */
export const getOneAwsProfileExportCacheDir = (): string =>
  join(getHomeDir(), '.rhachet', 'keyrack', 'cache', 'aws.export');
