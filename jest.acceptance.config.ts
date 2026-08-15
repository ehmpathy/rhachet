/**
 * @jest-config-loader esbuild-register
 */
import type { Config } from 'jest';

// ensure tests run in utc, like they will on cicd and on server; https://stackoverflow.com/a/56277249/15593329
process.env.TZ = 'UTC';

// ensure tests run like on local machines, so snapshots are equal on local && cicd
process.env.FORCE_COLOR = 'true';

// https://jestjs.io/docs/configuration
const config: Config = {
  verbose: true,
  reporters: [['default', { summaryThreshold: 0 }]], // ensure we always get a failure summary at the bottom, to avoid the hunt
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  transformIgnorePatterns: [
    // here's an example of how to ignore esm module transformation, when needed
    // 'node_modules/(?!(@octokit|universal-user-agent|before-after-hook)/)',
  ],
  testMatch: [
    // ONE acceptance suite — every acceptance test drives the REAL external
    // contract, the real-claude reach tier included. there is no separate
    // real-brain config: `rule.forbid.faked-or-quarantined-acceptance` bans a
    // quarantine of the only real-contract tests out of the default gate. a
    // real-brain test bounds its own cost WITHIN the test (one shared spawn, a
    // deterministic marker, a bounded wall-clock) and fails LOUD — never skips —
    // when the brain/credential is absent.
    '**/*.acceptance.test.ts',
    '!**/.yalc/**',
    // exclude rmsafe trash — deleted test files land in this gitignored cache dir;
    // jest would otherwise discover a stale copy and fail on its broken imports
    '!**/.agent/.cache/**',
  ],
  setupFilesAfterEnv: ['./jest.acceptance.env.ts'],

  // use 50% of threads to leave headroom for other processes
  maxWorkers: '50%', // https://stackoverflow.com/questions/71287710/why-does-jest-run-faster-with-maxworkers-50
};

// eslint-disable-next-line import/no-default-export
export default config;
