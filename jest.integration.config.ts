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
  moduleFileExtensions: ['js', 'ts', 'mjs'],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    // map esm subpath exports for noble/scure packages
    // handle imports with .js extension (from age-encryption)
    '^@noble/hashes/(.*)\\.js$': '<rootDir>/node_modules/@noble/hashes/$1.js',
    '^@noble/curves/(.*)\\.js$': '<rootDir>/node_modules/@noble/curves/$1.js',
    // handle imports without .js extension
    '^@noble/hashes/([^.]+)$': '<rootDir>/node_modules/@noble/hashes/$1.js',
    '^@noble/curves/([^.]+)$': '<rootDir>/node_modules/@noble/curves/$1.js',
    '^@scure/base$': '<rootDir>/node_modules/@scure/base/index.js',
  },
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
    '^.+\\.mjs$': '@swc/jest',
  },
  transformIgnorePatterns: [
    // transform ESM packages that jest needs to handle
    // pattern handles both direct node_modules and pnpm's .pnpm structure
    '/node_modules/(?!(\\.pnpm/(age-encryption|@noble|@scure|@octokit|universal-|@anthropic-ai|@openai))|(age-encryption|@noble|@scure|@octokit|universal-|@anthropic-ai|@openai))',
  ],
  // resolve ESM modules from node_modules
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/*.integration.test.ts', '!**/.yalc/**'],
  setupFilesAfterEnv: ['./jest.integration.env.ts'],

  // use 50% of threads to leave headroom for other processes
  maxWorkers: '50%', // https://stackoverflow.com/questions/71287710/why-does-jest-run-faster-with-maxworkers-50
};

// eslint-disable-next-line import/no-default-export
export default config;
