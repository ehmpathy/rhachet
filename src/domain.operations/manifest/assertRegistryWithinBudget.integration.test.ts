import { getError, given, then, useThen, when } from 'test-fns';

import { asLogLines } from '@src/.test/infra/asLogLines';
import { Role, RoleRegistry } from '@src/domain.objects';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { posix, resolve, win32 } from 'node:path';
import { assertRegistryWithinBudget } from './assertRegistryWithinBudget';

/**
 * .what = clamps GATE 1 — the budget refusal that fires at `repo introspect`, pre-publish
 * .why = `0.wish.md` requirement 9. this is the only gate whose spec is writable by
 *        construction, so it is the gate that makes the vision's aha-line literally true:
 *        the author meets the cap in their own tree, on a git-tracked file, on a command
 *        they already run. a consumer-side gate alone could promise no such thing.
 */
describe('assertRegistryWithinBudget (integration)', () => {
  const testDir = resolve(__dirname, './.temp/assertRegistryWithinBudget');

  /**
   * .what = writes a role package's own role dir — the FLAT layout every role here uses
   * .why = `boot.yml`, `readme.md`, `briefs/`, and `skills/` all sit under one dir, which
   *        is what lets the gate derive the whole source from the spec's own path
   */
  const genRoleDir = (input: { slug: string; spec: string }): string => {
    const dir = resolve(testDir, `src/domain.roles/${input.slug}`);
    mkdirSync(resolve(dir, 'briefs'), { recursive: true });
    mkdirSync(resolve(dir, 'skills'), { recursive: true });

    writeFileSync(resolve(dir, 'readme.md'), '## the role\n');
    writeFileSync(
      resolve(dir, 'briefs', 'core.md'),
      '# core\n'.concat('a rule this role always carries.\n'.repeat(40)),
    );
    writeFileSync(resolve(dir, 'boot.yml'), input.spec);

    return dir;
  };

  /**
   * .what = a registry of exactly one role, shaped as a real one
   * .why = the gate reads `registry.slug` + `role.slug` to compute the LABEL a consumer
   *        will see once the package is linked, so both slugs are load-bearing
   */
  const genRegistry = (input: {
    slugRole: string;
    dirRole: string;
    dirBriefs?: string;
  }): RoleRegistry =>
    new RoleRegistry({
      slug: 'demo',
      readme: { uri: resolve(testDir, 'readme.md') },
      roles: [
        new Role({
          slug: input.slugRole,
          name: input.slugRole,
          purpose: 'a role under test',
          readme: { uri: resolve(input.dirRole, 'readme.md') },
          traits: [],
          skills: { dirs: { uri: resolve(input.dirRole, 'skills') }, refs: [] },
          briefs: {
            dirs: { uri: input.dirBriefs ?? resolve(input.dirRole, 'briefs') },
          },
          boot: { uri: resolve(input.dirRole, 'boot.yml') },
        }),
      ],
    });

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    writeFileSync(resolve(testDir, 'readme.md'), '## the registry\n');
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    errSpy.mockClear();
    logSpy.mockClear();
  });

  given('[case1] a role whose payload exceeds the budget it declares', () => {
    when('[t0] the registry is introspected', () => {
      /**
       * .what = ONE refusal, observed once — every `then` below reads the same halt
       *   (`rule.forbid.redundant-expensive-operations`)
       *
       * 🔴 .why = captured here, not read per `then` — a later read risks a vacuous pass
       *   on a spy cleared by `beforeEach` (`rule.forbid.failhide`).
       */
      const halt = useThen('it refuses the build', async () => {
        const dirRole = genRoleDir({
          slug: 'over',
          spec: [
            'budget:',
            '  tokens: 20',
            'always:',
            '  briefs:',
            "    say: ['**/*.md']",
            '',
          ].join('\n'),
        });

        const error = await getError(
          assertRegistryWithinBudget({
            dirRepo: testDir,
            registry: genRegistry({ slugRole: 'over', dirRole }),
          }),
        );

        return {
          message: error.message,
          countStdoutCalls: logSpy.mock.calls.length,
          readout: asLogLines(errSpy).join('\n'),
        };
      });

      then('it refuses the build, and names the overage', () => {
        expect(halt.message).toContain(
          'boot payload exceeds its declared budget',
        );
        expect(halt.message).toMatch(/"budget":\s*20/);
      });

      then('the refusal names the invocation the AUTHOR runs', () => {
        // 🔴 the halt must name the command that produced it, never a generic one — the
        //    whole point of gate 1 is that the author meets the cap where THEY stand
        expect(halt.readout).toContain('repo introspect');
        expect(halt.readout).toContain('role=over');

        // 🔴 and it must name the SPEC PATH, which is the fact that earns this gate its
        //    place: requirement 9 puts the refusal here because THIS spec is the one the
        //    halted party can write. a halt that names the role alone withholds it
        expect(halt.readout).toContain('src/domain.roles/over/boot.yml');

        // asserted negatively too — an absolute path would pin this run's temp dir into
        // the readout, so it would differ per machine and per invocation
        expect(halt.readout).not.toContain(`${testDir}/src`);
      });

      then('the refusal carries the same four strategies', () => {
        // one readout for both gates — a gate with its own remedy vocabulary would
        // teach an author two ladders for one cap
        const order = ['catalogize', 'condense', 'reference', 'eliminate'].map(
          (verb) => halt.readout.indexOf(verb),
        );
        expect(order.every((index) => index > -1)).toEqual(true);
        expect(order).toEqual([...order].sort((a, b) => a - b));
      });

      then('the refusal names NO individual resource', () => {
        // 🔴 asserted NEGATIVELY — the gate sees a resource's COST and never its VALUE, so a
        //    builder must not re-add a per-resource block as a kindness. one readout serves
        //    both gates, so each gate pins it.
        //
        // 🟡 it names the FIXTURE's own resources, never the literal `.md` — the `condense`
        //    gloss reads "author an x.md.min beside x.md", so a bare extension check would
        //    grade the remedy ladder as a resource list
        expect(halt.readout).not.toContain('briefs/core.md');
        expect(halt.readout).not.toContain('readme.md');
      });

      then('it emits NOT ONE BYTE of the payload it refuses', () => {
        // requirement 2 at gate 1 is true by construction — introspect never boots — and
        // this clamps that the gate did not print the payload to prove its own point.
        // 🟡 the count is captured at the moment of the run, never read from the spy here
        expect(halt.countStdoutCalls).toEqual(0);
      });

      then('the whole refusal matches its snapshot', () => {
        // .why = a `toContain` cannot see order, alignment, or an absent line
        //   (`rule.require.contract-snapshot-exhaustiveness`)
        //
        // .stream = STDERR. the halt writes not one byte to stdout, so a stdout snapshot
        //   here would pin the empty string — a clamp that passes forever and proves naught
        //   (`rule.forbid.failhide`).
        //
        // .readout = raw stderr lines, joined. no error-readout wrapper, so what is pinned is
        //   what a terminal shows. the fixture is byte-deterministic — fixed docs, repeated
        //   40x — so the counts inside are stable across machines.
        expect(halt.readout).toMatchSnapshot();
      });
    });
  });

  given('[case2] a role whose payload fits the budget it declares', () => {
    when('[t0] the registry is introspected', () => {
      then('it passes, and refuses naught', async () => {
        const dirRole = genRoleDir({
          slug: 'under',
          spec: [
            'budget:',
            '  tokens: 5000',
            'always:',
            '  briefs:',
            "    say: ['**/*.md']",
            '',
          ].join('\n'),
        });

        await assertRegistryWithinBudget({
          dirRepo: testDir,
          registry: genRegistry({ slugRole: 'under', dirRole }),
        });

        expect(errSpy).not.toHaveBeenCalled();
      });
    });
  });

  given('[case3] a role that declares NO budget', () => {
    when('[t0] the registry is introspected', () => {
      then('it passes, however large its payload', async () => {
        const dirRole = genRoleDir({
          slug: 'unbudgeted',
          spec: ['always:', '  briefs:', "    say: ['**/*.md']", ''].join('\n'),
        });

        await assertRegistryWithinBudget({
          dirRepo: testDir,
          registry: genRegistry({ slugRole: 'unbudgeted', dirRole }),
        });

        // requirement 4, at gate 1 — the cap is opt-in per spec, so a role that declares
        // none pays no cost at all: no scan, no tokenizer load
        expect(errSpy).not.toHaveBeenCalled();
      });
    });
  });

  given('[case4] a BUDGETED role whose briefs sit outside its role dir', () => {
    when('[t0] the registry is introspected', () => {
      then('it refuses, rather than measure the payload short', async () => {
        const dirRole = genRoleDir({
          slug: 'split',
          spec: [
            'budget:',
            '  tokens: 5000',
            'always:',
            '  briefs:',
            "    say: ['**/*.md']",
            '',
          ].join('\n'),
        });

        const dirBriefs = resolve(testDir, 'elsewhere/briefs');
        mkdirSync(dirBriefs, { recursive: true });
        writeFileSync(resolve(dirBriefs, 'core.md'), '# core\n');

        const error = await getError(
          assertRegistryWithinBudget({
            dirRepo: testDir,
            registry: genRegistry({
              slugRole: 'split',
              dirRole,
              dirBriefs,
            }),
          }),
        );

        // 🔴 the gate scans the role dir, so an off-dir brief would be counted at zero here
        //    and rendered in full by a consumer. a cap that passes a payload the consumer
        //    then exceeds is the silent pass requirement 2 exists to forbid — so the gate
        //    refuses the LAYOUT rather than report a number it knows is short
        expect(error.message).toContain(
          'declares resources outside its own role dir',
        );
        expect(error.message).toContain('split');

        // the whole refusal, pinned — the temp dir is masked, since it differs per machine
        expect(
          error.message.split(testDir).join('/TEST_DIR'),
        ).toMatchSnapshot();
      });
    });
  });

  // [case5] clamps the PREMISE the escape test rests on, never its output
  //    (`rule.require.clamp-the-premise-a-guard-rests-on`). `[case4]` above measures the guard's
  //    ANSWER on posix, and a `..`-prefixed relative satisfies it down either arm — so it stays
  //    green whichever second arm the guard carries, and it grades no part of the win32 case.
  //
  //    🟡 the production `relative` is platform-bound and CI is linux, so the win32 shapes cannot
  //    reach the guard from a run here at all. `path.win32` is the only instrument that can state
  //    them.
  given(
    '[case5] the win32 cross-root shapes the escape test is written for',
    () => {
      when('[t0] `relative` crosses a DRIVE boundary', () => {
        // across a drive letter, `relative` returns the target's own absolute path rather
        // than `..` segments — so an off-dir brief on another drive reads as INSIDE the
        // role unless the guard tests `isAbsolute`, and the gate would scan short, which is
        // the silent pass requirement 2 exists to forbid
        const within = win32.relative('C:\\repo\\role', 'D:\\evil\\briefs');

        then(
          'it returns the target own absolute path, not `..` segments',
          () => {
            expect(within).toEqual('D:\\evil\\briefs');
          },
        );

        then('the `..` arm misses it', () => {
          expect(within.startsWith('..')).toBe(false);
        });

        then('a bare `startsWith(win32.sep)` arm misses it too', () => {
          // the row that reddens a guard built on that arm alone: neither it nor the `..`
          // arm matches a drive letter, so only `isAbsolute` catches this shape
          expect(within.startsWith(win32.sep)).toBe(false);
        });

        then('the `isAbsolute` arm catches it', () => {
          expect(win32.isAbsolute(within)).toBe(true);
        });
      });

      when('[t1] `relative` crosses to a UNC target', () => {
        // the shape a bare `startsWith(sep)` arm DOES catch — clamped so `isAbsolute` is
        // shown to SUBSUME that reach, never merely replace it
        const within = win32.relative(
          'C:\\repo\\role',
          '\\\\host\\share\\briefs',
        );

        then('a bare `startsWith(win32.sep)` arm catches this one', () => {
          expect(within.startsWith(win32.sep)).toBe(true);
        });

        then('the `isAbsolute` arm subsumes it', () => {
          expect(win32.isAbsolute(within)).toBe(true);
        });
      });

      when('[t2] `relative` stays within one posix root', () => {
        // the arm costs naught on posix: `relative` has one root to return against, so it never
        // yields an absolute path and the second arm can never fire on a legitimate in-dir value
        then('an in-dir target is never absolute', () => {
          expect(
            posix.isAbsolute(posix.relative('/repo/role', '/repo/role/briefs')),
          ).toBe(false);
        });

        then(
          'an escaped target is `..`-prefixed, so the FIRST arm carries posix',
          () => {
            expect(
              posix
                .relative('/repo/role', '/elsewhere/briefs')
                .startsWith('..'),
            ).toBe(true);
          },
        );
      });
    },
  );
});
