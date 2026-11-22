/**
 * @jest-config-loader esbuild-register
 */
import type { Config } from 'jest';

import config from '../../../../jest.integration.config';

/**
 * .what = the integration config, with its keyrack source swapped out of the globalSetup
 * .why = the clamp's `genTestTempRepo` case measures the autoprune teardown under the integration
 *        tier — and neither genTestTempRepo nor the teardown reads a brain api key. the tier's
 *        globalSetup strictly sources four of them, one layer above the subject, so a host without
 *        them could not run the case at all. this config keeps every integration key the subject
 *        touches (transforms, module maps, env file, the autoprune teardown) and replaces only the
 *        globalSetup with the key-free composition the unit tier uses: the autoprune setup plus the
 *        interrupt reclaim
 */
const configKeyless: Config = {
  ...config,
  globalSetup: './jest.unit.globalSetup.ts',
  rootDir: '../../../..',
};

// eslint-disable-next-line import/no-default-export
export default configKeyless;
