/**
 * @jest-config-loader esbuild-register
 */
import type { Config } from 'jest';

import config from '../../../../jest.unit.config';

/**
 * .what = the unit config with the autoprune hooks REMOVED
 * .why = the clamp's control: under it, the probe dirs must SURVIVE. a clamp that
 *        cannot see a leak would read zero either way — green, and blind
 */
const { globalSetup: _setup, globalTeardown: _teardown, ...unwired } = config;
const configUnwired: Config = { ...unwired, rootDir: '../../../..' };

// eslint-disable-next-line import/no-default-export
export default configUnwired;
