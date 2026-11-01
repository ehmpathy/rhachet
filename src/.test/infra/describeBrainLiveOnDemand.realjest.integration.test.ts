import { spawn } from 'node:child_process';
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { type AddressInfo } from 'node:net';
import { createServer } from 'node:http';
import { delimiter, join } from 'node:path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { getAllSuitesGated } from './getAllSuitesGated';

/**
 * .what = every env key a gated body could read a vendor credential from
 * .why = read from the env by the shape of a credential name, so a key the test keyrack adds
 *   later is stripped too; a hand list would leave a new key in the proof's env and fail open
 */
const VENDOR_KEYS = [
  ...new Set([
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_AUTH_TOKEN',
    'CLAUDE_CODE_OAUTH_TOKEN',
    'OPENAI_API_KEY',
    'XAI_API_KEY',
    ...Object.keys(process.env).filter((key) => /(_API_KEY|_AUTH_TOKEN|_OAUTH_TOKEN)$/.test(key)),
  ]),
];

/** the repo root, three hops above src/.test/infra */
const REPO_ROOT = join(__dirname, '..', '..', '..');

/** jest's own bin, run under node */
const JEST_BIN = join(REPO_ROOT, 'node_modules', 'jest', 'bin', 'jest.js');

/**
 * .what = run real jest on the gated fixture suite, with a given BRAIN_LIVE_SCOPE
 * .why = proves the gate under jest's own describe, skip and todo, not under fakes
 * .note = jest runs by its bin under node, never through npm (rule.forbid.npm-in-tests)
 */
const runJestOnFixture = async (input: {
  scope: string;
  testMatch?: string[];
  envOmit?: string[];
  envAdd?: Record<string, string>;
  config?: 'jest.unit.config.ts' | 'jest.integration.config.ts' | 'jest.acceptance.config.ts';
}): Promise<{ status: number | null; output: string }> => {
  // the env the child runs with: the flag set, each omitted key removed, each added key set
  //   (added after the omit, so a decoy key takes the place of the real one it strips)
  const env = {
    ...Object.fromEntries(
      Object.entries({ ...process.env, BRAIN_LIVE_SCOPE: input.scope, FORCE_COLOR: '0' }).filter(
        ([key]) => !(input.envOmit ?? []).includes(key),
      ),
    ),
    ...input.envAdd,
  };
  // async, so the loop keeps its turns: a tripwire listener in this process must answer
  const child = spawn(
    process.execPath,
    [
      JEST_BIN,
      '-c',
      input.config ?? 'jest.unit.config.ts',
      // the integration and acceptance configs' own globalSetup sources the test keys; the
      //   plain autoprune setup takes its place, so the keys stay stripped
      ...(input.config === 'jest.integration.config.ts' || input.config === 'jest.acceptance.config.ts'
        ? ['--globalSetup', 'test-fns/autoprune.setup.jest']
        : []),
      '--ci',
      '--testPathIgnorePatterns',
      '/node_modules/',
      '--testMatch',
      ...(input.testMatch ?? [
        '<rootDir>/src/.test/infra/.fixture/describeBrainLiveOnDemand.realjest.fixture.ts',
      ]),
    ],
    { cwd: REPO_ROOT, env },
  );
  const chunks: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => chunks.push(chunk));
  const status = await new Promise<number | null>((done) => child.on('close', done));
  // the acceptance config forces color, so the report's ansi codes are stripped before a read
  return { status, output: Buffer.concat(chunks).toString().replace(/\x1b\[[0-9;]*m/g, '') };
};

/**
 * .what = a tripwire for a live reach at collection: a decoy `claude` first on PATH that logs
 *   each run, decoy vendor keys, and the vendor base urls aimed at a local listener that counts
 *   each connection
 * .why = a stripped key proves no key is read, but a key-less spawn returns a status and a
 *   never-awaited brain call fails unseen; on a push the key is there, and the same body bills.
 *   the tripwire observes the reach itself, whatever its syntax, which the text scan cannot
 * .note = a supplier that pins its own vendor url (not from the env) is not caught by the
 *   listener; a supplier that spawns the cli by an absolute path is not caught by the decoy
 */
const genTripwire = async (): Promise<{
  envAdd: Record<string, string>;
  getRunsOfDecoy: () => string[];
  getHitsOfListener: () => number;
  close: () => Promise<void>;
}> => {
  // the decoy cli: log the run, then fail, so a body that awaits it sees no answer
  const dir = genTempDir({ slug: 'brain-live-tripwire' });
  const logPath = join(dir, 'decoy.log');
  writeFileSync(logPath, '');
  const binPath = join(dir, 'claude');
  writeFileSync(binPath, `#!/bin/sh\necho "$*" >> "${logPath}"\nexit 1\n`);
  chmodSync(binPath, 0o755);

  // the listener: count each connection, answer each request with a refusal
  const hits = { count: 0 };
  const server = createServer((_req, res) => res.writeHead(401).end());
  server.on('connection', () => {
    hits.count += 1;
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address() as AddressInfo; // node types an address as a union
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    envAdd: {
      PATH: `${dir}${delimiter}${process.env.PATH ?? ''}`,
      ANTHROPIC_API_KEY: 'sk-ant-tripwire-decoy',
      OPENAI_API_KEY: 'sk-tripwire-decoy',
      XAI_API_KEY: 'xai-tripwire-decoy',
      ANTHROPIC_BASE_URL: baseUrl,
      OPENAI_BASE_URL: baseUrl,
    },
    getRunsOfDecoy: () => readFileSync(logPath, 'utf8').split('\n').filter(Boolean),
    getHitsOfListener: () => hits.count,
    close: () => new Promise<void>((done) => server.close(() => done())),
  };
};

describe('describeBrainLiveOnDemand, under real jest', () => {
  given('[case1] the gated fixture suite', () => {
    when('[t0] the run sets no BRAIN_LIVE_SCOPE', () => {
      const run = useBeforeAll(async () => runJestOnFixture({ scope: '' }));

      then('jest exits 0, as a skip is no failure', () => {
        expect(run.status).toEqual(0);
      });
      then('the report holds the todo row that names the tier and the flag', () => {
        expect(run.output).toContain(
          '[gated: tier-3 live brain] realjest fixture suite — run with rhx test.brain.live, which sets BRAIN_LIVE_SCOPE=all',
        );
      });
      then('the report counts the gated test as skipped', () => {
        expect(run.output).toMatch(/1 skipped/);
      });
      then('the report counts the todo row', () => {
        expect(run.output).toMatch(/1 todo/);
      });
      then('the gated body never ran, so no live call could be made', () => {
        expect(run.output).not.toContain('REALJEST_FIXTURE_BODY_RAN');
      });
    });

    when('[t1] the run sets BRAIN_LIVE_SCOPE=true, a typo', () => {
      const run = useBeforeAll(async () => runJestOnFixture({ scope: 'true' }));

      then('jest fails the suite at collection', () => {
        expect(run.status).not.toEqual(0);
      });
      then('the failure is the gate refusal', () => {
        expect(run.output).toContain("BRAIN_LIVE_SCOPE must be 'all' or unset");
      });
      then('the gated body never ran', () => {
        expect(run.output).not.toContain('REALJEST_FIXTURE_BODY_RAN');
      });
    });

    when('[t2] the run sets BRAIN_LIVE_SCOPE=all', () => {
      const run = useBeforeAll(async () => runJestOnFixture({ scope: 'all' }));

      then('jest exits 0', () => {
        expect(run.status).toEqual(0);
      });
      then('jest runs the gated body under its own title', () => {
        expect(run.output).toContain('REALJEST_FIXTURE_BODY_RAN');
      });
      then('the report holds no todo row', () => {
        expect(run.output).not.toContain('[gated: tier-3 live brain]');
      });
    });
  });

  // every wholly gated suite, by the clamp's own syntax-tree check; acceptance suites run under
  //   their own config, and every other gated suite under the integration config
  const gatedAll = getAllSuitesGated({ cwd: REPO_ROOT });
  const isAcceptance = (path: string): boolean => path.endsWith('.acceptance.test.ts');

  given('[case2] every wholly gated suite outside acceptance, with no vendor key in the env', () => {
    const gated = gatedAll.filter((path) => !isAcceptance(path));

    when('[t0] jest collects them with BRAIN_LIVE_SCOPE unset', () => {
      const run = useBeforeAll(async () =>
        runJestOnFixture({
          scope: '',
          config: 'jest.integration.config.ts',
          testMatch: gated.map((path) => `<rootDir>/${path}`),
          envOmit: VENDOR_KEYS,
        }),
      );

      then('there are gated suites to collect', () => {
        expect(gated.length).toBeGreaterThan(5);
      });
      then('jest exits 0', () => {
        expect(run.status).toEqual(0);
      });
      then('each one collects, so no gated body reads a key or does i/o at collection', () => {
        // a suite with a todo row counts as passed; every test in it is skipped or todo
        expect(run.output).toContain(`Test Suites: ${gated.length} passed, ${gated.length} total`);
      });
      then('each one skips, beside one todo row per suite', () => {
        expect(run.output).toMatch(
          new RegExp(`Tests:\\s+\\d+ skipped, ${gated.length} todo, \\d+ total`),
        );
      });
      then('no test fails', () => {
        expect(run.output).not.toMatch(/\d+ failed/);
      });
    });
  });

  given('[case3] every wholly gated acceptance suite, with no vendor key in the env', () => {
    const gated = gatedAll.filter(isAcceptance);

    when('[t0] jest collects them under the acceptance config, with BRAIN_LIVE_SCOPE unset', () => {
      const run = useBeforeAll(async () =>
        runJestOnFixture({
          scope: '',
          config: 'jest.acceptance.config.ts',
          testMatch: gated.map((path) => `<rootDir>/${path}`),
          envOmit: VENDOR_KEYS,
        }),
      );

      then('there are gated acceptance suites to collect', () => {
        expect(gated.length).toBeGreaterThan(3);
      });
      then('jest exits 0', () => {
        expect(run.status).toEqual(0);
      });
      then('each one collects, so no gated body reads a key or does i/o at collection', () => {
        expect(run.output).toContain(`Test Suites: ${gated.length} passed, ${gated.length} total`);
      });
      then('each one skips, beside one todo row per suite', () => {
        expect(run.output).toMatch(
          new RegExp(`Tests:\\s+\\d+ skipped, ${gated.length} todo, \\d+ total`),
        );
      });
      then('no test fails', () => {
        expect(run.output).not.toMatch(/\d+ failed/);
      });
    });
  });

  // a run with the tripwire armed: real keys stripped, decoys in their place
  const runJestUnderTripwire = async (input: {
    testMatch: string[];
    config: 'jest.integration.config.ts' | 'jest.acceptance.config.ts';
  }): Promise<{ status: number | null; output: string; runsOfDecoy: string[]; hitsOfListener: number }> => {
    const tripwire = await genTripwire();
    const run = await runJestOnFixture({
      scope: '',
      config: input.config,
      testMatch: input.testMatch,
      envOmit: VENDOR_KEYS,
      envAdd: tripwire.envAdd,
    });
    const result = {
      ...run,
      runsOfDecoy: tripwire.getRunsOfDecoy(),
      hitsOfListener: tripwire.getHitsOfListener(),
    };
    await tripwire.close();
    return result;
  };

  given('[case4] the tripwire: a decoy claude, decoy keys, and a listener behind the vendor urls', () => {
    when('[t0] jest collects a gated fixture whose body reaches a brain in shapes no marker names', () => {
      const run = useBeforeAll(async () =>
        runJestUnderTripwire({
          config: 'jest.integration.config.ts',
          testMatch: ['<rootDir>/src/.test/infra/.fixture/describeBrainLiveOnDemand.tripwire.fixture.ts'],
        }),
      );

      then('the decoy logs the spawn, so a body spawn at collection is seen', () => {
        expect(run.runsOfDecoy).toEqual(['hi']);
      });
      then('the listener counts the vendor call, so a body call at collection is seen', () => {
        expect(run.hitsOfListener).toBeGreaterThan(0);
      });
    });

    when('[t1] jest collects every wholly gated suite outside acceptance', () => {
      const run = useBeforeAll(async () =>
        runJestUnderTripwire({
          config: 'jest.integration.config.ts',
          testMatch: gatedAll.filter((path) => !isAcceptance(path)).map((path) => `<rootDir>/${path}`),
        }),
      );

      then('no gated body spawns the cli at collection', () => {
        expect(run.runsOfDecoy).toEqual([]);
      });
      then('no gated body calls a vendor at collection', () => {
        expect(run.hitsOfListener).toEqual(0);
      });
      then('jest exits 0', () => {
        expect(run.status).toEqual(0);
      });
    });

    when('[t2] jest collects every wholly gated acceptance suite', () => {
      const run = useBeforeAll(async () =>
        runJestUnderTripwire({
          config: 'jest.acceptance.config.ts',
          testMatch: gatedAll.filter(isAcceptance).map((path) => `<rootDir>/${path}`),
        }),
      );

      then('no gated body spawns the cli at collection', () => {
        expect(run.runsOfDecoy).toEqual([]);
      });
      then('no gated body calls a vendor at collection', () => {
        expect(run.hitsOfListener).toEqual(0);
      });
      then('jest exits 0', () => {
        expect(run.status).toEqual(0);
      });
    });
  });
});
