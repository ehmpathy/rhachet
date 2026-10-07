import { Command } from 'commander';
import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, useThen, when } from 'test-fns';

import { asLogLines } from '@src/.test/infra/asLogLines';

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { invokeRolesBoot } from './invokeRolesBoot';
import { invokeRolesCost } from './invokeRolesCost';

/**
 * .what = the token total a readout reports, taken from its own emitted lines
 * .why = the identity clamp below compares what `roles boot` and `roles cost` each PRINT,
 *        never what either computes. a comparison of two internal calls would hold even
 *        where the two renders disagree, which is the very drift it exists to catch.
 */
const asTokenTotal = (lines: string[]): number => {
  const line = lines.find((each) => /tokens\s*[≈=]/.test(each));
  if (!line)
    throw new MalfunctionError(`no token line found in:\n${lines.join('\n')}`);
  const digits = line.replace(/,/g, '').match(/tokens\s*[≈=]\s*(\d+)/);
  if (!digits) throw new MalfunctionError(`no token count in: ${line}`);
  return Number(digits[1]);
};

describe('invokeRolesCost (integration)', () => {
  given('[case1] a role whose boot emits a payload', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesCost');
    const cwdOriginal = process.cwd();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const commandCost = new Command('roles');
    const commandBoot = new Command('roles');
    invokeRolesCost({ command: commandCost });
    invokeRolesBoot({ command: commandBoot });

    beforeAll(() => {
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      const dirAgent = resolve(testDir, '.agent');
      if (existsSync(dirAgent))
        rmSync(dirAgent, { recursive: true, force: true });

      const dirRole = resolve(testDir, '.agent/repo=test/role=mechanic');
      mkdirSync(resolve(dirRole, 'briefs'), { recursive: true });
      mkdirSync(resolve(dirRole, 'skills'), { recursive: true });

      writeFileSync(resolve(dirRole, 'readme.md'), '# mechanic\n\nthe readme.');
      writeFileSync(
        resolve(dirRole, 'briefs/brief1.md'),
        '# brief 1\nthis is test brief 1',
      );
      writeFileSync(
        resolve(dirRole, 'briefs/brief2.md'),
        '# brief 2\nthis is test brief 2',
      );
      writeFileSync(
        resolve(dirRole, 'skills/skill1.sh'),
        '#!/bin/bash\n# skill 1\necho "test skill 1"',
      );
    });

    afterAll(() => {
      process.chdir(cwdOriginal);
    });

    beforeEach(() => {
      logSpy.mockClear();
    });

    when('[t0] the cost report is run', () => {
      /**
       * .what = ONE report, observed once — the four `then`s below read the same render
       *   (`rule.forbid.redundant-expensive-operations`)
       * .note = captured here, since the suite's `beforeEach` clears the spy before each `then`
       */
      const report = useThen('it renders', async () => {
        await commandCost.parseAsync(
          ['cost', '--repo', 'test', '--role', 'mechanic'],
          { from: 'user' },
        );
        const lines = asLogLines(logSpy);
        return { header: lines[0]!, readout: lines.join('\n') };
      });

      // 🔴 the clamp on the header verb. `BootSource.invocation` names the BOOT, so a
      //    readout headed with it names a command the reader did not type
      then('it heads with the cost verb, never the boot verb', () => {
        expect(report.header).toEqual(
          '🧢 roles cost --repo test --role mechanic',
        );
      });

      // `rule.prefer.lowercase` — a header that shouts is a header that drifts from every
      // peer surface this cli renders
      then('the header carries no capitals', () => {
        expect(report.header).toEqual(report.header.toLowerCase());
      });

      then('it ranks where the tokens go', () => {
        expect(report.readout).toContain('where the tokens go');
        expect(report.readout).toContain('brief1.md');
      });

      // the column counts each batch ALONE, so it never reaches the total. the residual is
      // named rather than left to read as an arithmetic defect (`rule.forbid.failhide`)
      then('it names the chrome residual', () => {
        expect(report.readout).toContain('chrome');
      });
    });

    when('[t1] the same role is booted, with no budget declared', () => {
      // an unbudgeted `<stats>` block stays the `chars ÷ 4` estimate; `roles cost` reports
      // the measured count
      then(
        'the boot stats understate, and cost reports the truth',
        async () => {
          await commandCost.parseAsync(
            ['cost', '--repo', 'test', '--role', 'mechanic'],
            { from: 'user' },
          );
          const tokensCost = asTokenTotal(asLogLines(logSpy));

          logSpy.mockClear();
          await commandBoot.parseAsync(
            ['boot', '--repo', 'test', '--role', 'mechanic'],
            { from: 'user' },
          );
          const tokensBoot = asTokenTotal(asLogLines(logSpy));

          expect(tokensCost).toBeGreaterThan(tokensBoot);
        },
      );
    });
  });

  given('[case5] a role whose boot.yml declares a budget', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesCost-budgeted');
    const cwdOriginal = process.cwd();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const commandCost = new Command('roles');
    const commandBoot = new Command('roles');
    invokeRolesCost({ command: commandCost });
    invokeRolesBoot({ command: commandBoot });

    beforeAll(() => {
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      const dirAgent = resolve(testDir, '.agent');
      if (existsSync(dirAgent))
        rmSync(dirAgent, { recursive: true, force: true });

      const dirRole = resolve(testDir, '.agent/repo=test/role=mechanic');
      mkdirSync(resolve(dirRole, 'briefs'), { recursive: true });

      writeFileSync(resolve(dirRole, 'readme.md'), '# mechanic\n\nthe readme.');
      writeFileSync(
        resolve(dirRole, 'briefs/brief1.md'),
        '# brief 1\nthis is test brief 1',
      );
      writeFileSync(
        resolve(dirRole, 'boot.yml'),
        'budget:\n  tokens: 50_000\nbriefs:\n  say:\n    - brief1.md\n',
      );
    });

    afterAll(() => {
      process.chdir(cwdOriginal);
    });

    beforeEach(() => {
      logSpy.mockClear();
    });

    when('[t0] the role is costed and then booted', () => {
      // ONE cost render and ONE boot render, observed once
      // (`rule.forbid.redundant-expensive-operations`)
      const rendered = useThen('the two commands run', async () => {
        await commandCost.parseAsync(
          ['cost', '--repo', 'test', '--role', 'mechanic'],
          { from: 'user' },
        );
        const linesCost = asLogLines(logSpy);
        const tokensCost = asTokenTotal(linesCost);

        logSpy.mockClear();
        await commandBoot.parseAsync(
          ['boot', '--repo', 'test', '--role', 'mechanic'],
          { from: 'user' },
        );

        return {
          tokensCost,
          tokensBoot: asTokenTotal(asLogLines(logSpy)),
          readoutCost: linesCost.join('\n'),
        };
      });

      // 🔴 THE clamp of this suite. a budgeted boot counts the payload the gate counts, and
      //    `roles cost` reads that same render through that same counter — so the two are
      //    equal BY CONSTRUCTION. a drift here means the two assembled a payload separately
      //    again.
      then('the two commands report one identical total', () => {
        expect(rendered.tokensCost).toEqual(rendered.tokensBoot);
        expect(rendered.tokensCost).toBeGreaterThan(0);
      });

      then('the cost report names the declared cap', () => {
        expect(rendered.readoutCost).toContain('50,000 tokens');
      });
    });
  });

  given('[case2] a role directory with no resources in it', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesCost-empty');
    const cwdOriginal = process.cwd();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const rolesCommand = new Command('roles');
    invokeRolesCost({ command: rolesCommand });

    beforeAll(() => {
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      const dirAgent = resolve(testDir, '.agent');
      if (existsSync(dirAgent))
        rmSync(dirAgent, { recursive: true, force: true });
      mkdirSync(resolve(testDir, '.agent/repo=test/role=mechanic'), {
        recursive: true,
      });
    });

    afterAll(() => {
      process.chdir(cwdOriginal);
    });

    beforeEach(() => {
      logSpy.mockClear();
    });

    when('[t0] the cost report is run', () => {
      then(
        'it says the boot emits naught, rather than a total of zero',
        async () => {
          await rolesCommand.parseAsync(
            ['cost', '--repo', 'test', '--role', 'mechanic'],
            { from: 'user' },
          );
          const lines = asLogLines(logSpy);
          expect(
            lines.some((line) => line.includes('no resources found')),
          ).toEqual(true);
        },
      );
    });
  });

  given('[case3] a flag set that addresses no boot', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesCost-absent');
    const cwdOriginal = process.cwd();

    const rolesCommand = new Command('roles');
    invokeRolesCost({ command: rolesCommand });

    beforeAll(() => {
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      const dirAgent = resolve(testDir, '.agent');
      if (existsSync(dirAgent))
        rmSync(dirAgent, { recursive: true, force: true });
    });

    afterAll(() => {
      process.chdir(cwdOriginal);
    });

    when('[t0] no --role is named', () => {
      then('it refuses and names the flag', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['cost', '--repo', 'test'], { from: 'user' }),
        );
        expect(error?.message).toContain('--role is required');
      });
    });

    when('[t1] the role is not linked here', () => {
      then('it refuses and names the repair', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(
            ['cost', '--repo', 'test', '--role', 'mechanic'],
            { from: 'user' },
          ),
        );
        expect(error?.message).toMatch(/\.agent\/ directory not found|no role/);
        expect(error?.message).toContain('roles link');
      });
    });
  });

  given('[case4] one role slug carried by two repos', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesCost-ambiguous');
    const cwdOriginal = process.cwd();

    const rolesCommand = new Command('roles');
    invokeRolesCost({ command: rolesCommand });

    beforeAll(() => {
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      const dirAgent = resolve(testDir, '.agent');
      if (existsSync(dirAgent))
        rmSync(dirAgent, { recursive: true, force: true });

      mkdirSync(resolve(testDir, '.agent/repo=repo-one/role=mechanic'), {
        recursive: true,
      });
      mkdirSync(resolve(testDir, '.agent/repo=repo-two/role=mechanic'), {
        recursive: true,
      });
    });

    afterAll(() => {
      process.chdir(cwdOriginal);
    });

    when('[t0] no --repo parts them', () => {
      then('it refuses and names both candidates', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['cost', '--role', 'mechanic'], {
            from: 'user',
          }),
        );
        expect(error?.message).toContain('multiple repos');
        expect(error?.message).toContain('repo-one');
        expect(error?.message).toContain('repo-two');
        expect(error?.message).toContain('--repo');
      });
    });
  });

  /**
   * 🔴 .what = the POSITIVE twin of `[case4]` — one repo carries the slug, so `--repo` is
   *    inferred rather than demanded.
   *
   * .why = `[case4]` grades the refusal alone, which stays green if inference is removed
   */
  given('[case6] one repo carries the slug, and no --repo is named', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesCost-inferred');
    const cwdOriginal = process.cwd();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const rolesCommand = new Command('roles');
    invokeRolesCost({ command: rolesCommand });

    beforeAll(() => {
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      const dirAgent = resolve(testDir, '.agent');
      if (existsSync(dirAgent))
        rmSync(dirAgent, { recursive: true, force: true });

      const dirRole = resolve(testDir, '.agent/repo=test/role=mechanic');
      mkdirSync(dirRole, { recursive: true });
      writeFileSync(
        resolve(dirRole, 'readme.md'),
        '# mechanic\n\nthis role was reached without a --repo flag.',
      );
    });

    afterAll(() => {
      process.chdir(cwdOriginal);
      logSpy.mockRestore();
    });

    when('[t0] the cost report is run with --role alone', () => {
      // 🟡 one inference, observed once — the pair below grade two facets of one render
      //   (`rule.forbid.redundant-expensive-operations`)
      const report = useThen('it infers and renders', async () => {
        logSpy.mockClear();
        await rolesCommand.parseAsync(['cost', '--role', 'mechanic'], {
          from: 'user',
        });
        const lines = asLogLines(logSpy);
        return { header: lines[0]!, readout: lines.join('\n') };
      });

      then('it infers the repo, and the header names it', () => {
        // the header echoes the coordinates the command settled on, so an inferred `--repo`
        // is observable there — which is what makes this a clamp rather than a smoke test
        expect(report.header).toEqual(
          '🧢 roles cost --repo test --role mechanic',
        );
      });

      then('it reports the inferred repo payload, not an empty one', () => {
        expect(report.readout).toContain('readme.md');
      });
    });
  });
});
