import { ConstraintError } from 'helpful-errors';
import { given, then, useThen, when } from 'test-fns';

import { genTestTempDir } from '@src/.test/infra/genTestTempDir';
import { ContextCli } from '@src/domain.objects/ContextCli';

import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  detectPackageManager,
  execNpmInstallLocal,
} from './execNpmInstallLocal';

describe('execNpmInstallLocal', () => {
  given('a directory with package.json', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'execNpmInstallLocal',
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(
        'package.json',
        JSON.stringify({
          name: 'test-execnpminstall',
          version: '0.0.0',
          dependencies: {},
        }),
      );
    });

    afterAll(() => testDir.teardown());

    when('execNpmInstallLocal is called with a valid package', () => {
      then('npm install succeeds and package is added', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });

        // install a small, fast package
        execNpmInstallLocal(
          { packages: ['is-odd'], lifecycleHooks: 'skip' },
          context,
        );

        // verify package was added
        const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
        expect(pkg.dependencies['is-odd']).toBeDefined();
      });
    });

    when('execNpmInstallLocal is called with empty packages array', () => {
      then('returns early without error', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });

        // should not throw
        execNpmInstallLocal({ packages: [], lifecycleHooks: 'skip' }, context);
      });
    });
  });

  given('a directory with package.json but invalid package name', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'execNpmInstallLocal-invalid-pkg',
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(
        'package.json',
        JSON.stringify({
          name: 'test-execnpminstall-invalid',
          version: '0.0.0',
          dependencies: {},
        }),
      );
    });

    afterAll(() => testDir.teardown());

    when('execNpmInstallLocal is called with nonexistent package', () => {
      // 🚨 the strongest clamp on `package-absent` there is: a REAL install against
      //   the REAL registry, which answers a real 404. no fixture, no simulated log
      //
      // 🚨 `useThen`, never a bare IIFE at this scope. an IIFE here runs in jest's
      //   DESCRIBE-COLLECTION phase — ahead of the `beforeAll` above that creates the
      //   temp dir — so `spawnSync` is handed a `cwd` that does not exist, fails ENOENT
      //   with zero bytes written, and the run classifies as `unclassified` rather than
      //   `package-absent`. `useThen` runs inside a real `then`, so the setup has run.
      //
      // ⚠️ it passed locally under the IIFE, and that is the sharp part: `teardown()`
      //   only restores the cwd, so the dir a PRIOR run created is still on disk and the
      //   spawn finds one. green on a second local run, red on every fresh checkout —
      //   the ambient-state dependency `rule.require.hermetic-tests` names.
      // ⚠️ it yields PLAIN DATA, never the error itself. `useThen` hands siblings a proxy
      //   whose target carries only the OWN ENUMERABLE properties of the returned value —
      //   so a class instance loses both its prototype chain (`toBeInstanceOf` reads
      //   `Object`) and its methods (`.redact` is not a function). the reads that need the
      //   real instance are therefore performed HERE, where it is in hand, and only their
      //   results cross the boundary.
      const report = useThen('the install fails', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });
        // ⚠️ the catch yields the error or `undefined`, and the guard below is what
        //   turns `undefined` into a LOUD throw. the guard sits OUTSIDE the try on
        //   purpose — inside it, its own throw would be caught by its own catch and
        //   read back as the very error it exists to report absent
        const caught = ((): unknown => {
          try {
            execNpmInstallLocal(
              {
                packages: ['@rhachet/this-package-does-not-exist-12345'],
                lifecycleHooks: 'skip',
              },
              context,
            );
            return undefined;
          } catch (thrown) {
            return thrown;
          }
        })();

        // ⚠️ fail LOUD, never `return null`. a silent null would reach the sibling
        //   `then`s as an absent report and redden them on a property read of an empty
        //   value — a symptom three frames from its cause (`rule.forbid.failhide`)
        if (caught === undefined)
          throw new Error(
            'execNpmInstallLocal SUCCEEDED on a package the registry does not carry — the 404 path was never exercised',
          );

        const error = caught as ConstraintError;
        return {
          isConstraint: error instanceof ConstraintError,
          // ⚠️ carried BESIDE the boolean, never in place of it. the boolean is the
          //   real prototype-chain check; the name is what makes a red row
          //   diagnosable — `MalfunctionError` names a cause where `false` names none
          className: error.constructor.name,
          exitCode: (error as unknown as { code: { exit: number } }).code.exit,
          // ⚠️ the REDACTED sentence, never the raw `.message`. `HelpfulError`
          //   serializes its metadata into `.message`, so a `toContain` over the raw
          //   form matches the metadata blob rather than the sentence — an assertion
          //   that cannot fail. `redact` yields the sentence alone
          sentence: error.redact(['metadata', 'cause']).message,
          hint: (error as unknown as { metadata: { hint: string } }).metadata
            .hint,
        };
      });

      then('it throws a CONSTRAINT, and it exits 2', () => {
        // .why = a registry 404 is the CALLER's to fix — a retry with the same slug
        //   fails identically forever, so exit 1 ("may be transient, retry might
        //   help") would invite a pointless loop (`rule.require.exit-code-semantics`)
        expect(report.className).toEqual('ConstraintError');
        expect(report.isConstraint).toEqual(true);
        expect(report.exitCode).toEqual(2);
      });

      then('the sentence names the cause, and the hint names the fix', () => {
        expect(report.sentence).toContain('a requested package does not exist');
        expect(report.sentence).not.toContain('cause unclassified');
        expect(report.hint).toContain('the registry has no such package');
      });

      then(
        'the fix lives in the hint ALONE, never also in the sentence',
        () => {
          // 🚨 the clamp for the duplicate-hint defect: one instruction, one owner
          //   (`metadata.hint`), which every renderer reads by name. the mutation that
          //   reddens this row is to re-inline the hint into the sentence in
          //   `asNpmInstallFailureError`.
          //
          //   ⚠️ asserted as ABSENCE FROM THE SENTENCE, never as a count over a rendered
          //   frame — a render count is a second owner of the same fact, and it belongs
          //   to the renderer's own clamp (`asCliErrorFrame.test.ts`), never to a domain
          //   suite that would have to reach across the layer boundary to read it
          expect(report.sentence).not.toContain(report.hint);
        },
      );
    });
  });

  // 🚨 the lockfile read, against a REAL filesystem. its unit twin used to
  //   `jest.mock('node:fs')`, so every row proved the mock's `existsSync` rather than the
  //   read (`rule.forbid.unit.remote-boundaries`) — a real `existsSync` misuse, a wrong
  //   filename, or a join against the wrong dir all stayed green. these rows write real
  //   lockfiles into a real temp dir and let the real read answer.
  given('[case3] the lockfiles a project may carry', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'detectPackageManager',
    });
    beforeAll(() => testDir.setup());
    afterAll(() => testDir.teardown());

    when('[t0] a real pnpm-lock.yaml is on disk', () => {
      then('pnpm is detected', () => {
        writeFileSync(
          join(testDir.path, 'pnpm-lock.yaml'),
          "lockfileVersion: '9.0'\n",
        );
        expect(detectPackageManager({ cwd: testDir.path })).toEqual('pnpm');
      });
    });

    when('[t1] a real package-lock.json is on disk, and pnpm is gone', () => {
      then('npm is detected', () => {
        rmSync(join(testDir.path, 'pnpm-lock.yaml'), { force: true });
        writeFileSync(
          join(testDir.path, 'package-lock.json'),
          JSON.stringify({ lockfileVersion: 3 }),
        );
        expect(detectPackageManager({ cwd: testDir.path })).toEqual('npm');
      });
    });

    when('[t2] BOTH lockfiles are on disk', () => {
      then('pnpm wins — the documented preference', () => {
        // 🚨 the ORDER is the contract, and it is only observable with both present. a
        //   read that checked npm first would satisfy [t0] and [t1] and lie here
        writeFileSync(
          join(testDir.path, 'pnpm-lock.yaml'),
          "lockfileVersion: '9.0'\n",
        );
        expect(detectPackageManager({ cwd: testDir.path })).toEqual('pnpm');
      });
    });

    when('[t3] NEITHER lockfile is on disk', () => {
      then('pnpm is the default', () => {
        // `rule.require.pnpm-over-npm` — an unmanaged tree gets our preferred manager
        rmSync(join(testDir.path, 'pnpm-lock.yaml'), { force: true });
        rmSync(join(testDir.path, 'package-lock.json'), { force: true });
        expect(detectPackageManager({ cwd: testDir.path })).toEqual('pnpm');
      });
    });
  });
});
