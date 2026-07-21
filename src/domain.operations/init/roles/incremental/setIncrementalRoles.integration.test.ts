import { BadRequestError } from 'helpful-errors';
import { getError, given, then, useThen, when } from 'test-fns';

import { setMockLinkedRole } from '@src/.test/assets/setMockLinkedRole';
import { genTestTempDir } from '@src/.test/infra';
import { ContextCli } from '@src/domain.objects/ContextCli';
import { discoverLinkedRoles } from '@src/domain.operations/upgrade/discoverLinkedRoles';

import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setIncrementalRoles } from './setIncrementalRoles';

/**
 * .what = the current linked set as a sorted `repo/role` list
 * .why = lets each case assert the set-math result (current ∖ removes)
 *        against the real .agent/ state, not a single-role check
 */
const getLinkedSetSorted = (input: { context: ContextCli }): string[] =>
  discoverLinkedRoles({}, input.context)
    .map((r) => `${r.repo}/${r.role}`)
    .sort();

describe('setIncrementalRoles (integration) — remove-side set-math', () => {
  given('[case1] a current set of three linked roles', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'setIncrementalRoles-set-math',
    });
    const context = new ContextCli({
      cwd: testDir.path,
      gitroot: testDir.path,
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(resolve(testDir.path, 'src.md'), '# source');
      const agentDir = resolve(testDir.path, '.agent');
      const sourceReadme = resolve(testDir.path, 'src.md');
      setMockLinkedRole({
        agentDir,
        repo: 'ehmpathy',
        role: 'mechanic',
        sourceReadme,
      });
      setMockLinkedRole({
        agentDir,
        repo: 'ehmpathy',
        role: 'behaver',
        sourceReadme,
      });
      setMockLinkedRole({
        agentDir,
        repo: 'ehmpathy',
        role: 'reviewer',
        sourceReadme,
      });
    });
    afterAll(() => testDir.teardown());

    when('[t0] one role is removed', () => {
      const result = useThen('applies the removal', async () =>
        setIncrementalRoles(
          { additions: [], subtractions: ['reviewer'] },
          context,
        ),
      );

      then('the result set = current ∖ {reviewer}', () => {
        expect(getLinkedSetSorted({ context })).toEqual([
          'ehmpathy/behaver',
          'ehmpathy/mechanic',
        ]);
      });

      then('the removed role is reported', () => {
        expect(result.rolesRemoved).toEqual([
          { repo: 'ehmpathy', role: 'reviewer' },
        ]);
      });
    });
  });

  given('[case2] a current set of three linked roles', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'setIncrementalRoles-remove-many',
    });
    const context = new ContextCli({
      cwd: testDir.path,
      gitroot: testDir.path,
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(resolve(testDir.path, 'src.md'), '# source');
      const agentDir = resolve(testDir.path, '.agent');
      const sourceReadme = resolve(testDir.path, 'src.md');
      setMockLinkedRole({
        agentDir,
        repo: 'ehmpathy',
        role: 'mechanic',
        sourceReadme,
      });
      setMockLinkedRole({
        agentDir,
        repo: 'ehmpathy',
        role: 'behaver',
        sourceReadme,
      });
      setMockLinkedRole({
        agentDir,
        repo: 'ehmpathy',
        role: 'reviewer',
        sourceReadme,
      });
    });
    afterAll(() => testDir.teardown());

    when('[t0] two roles are removed in one call', () => {
      const result = useThen('applies the removals', async () =>
        setIncrementalRoles(
          { additions: [], subtractions: ['mechanic', 'reviewer'] },
          context,
        ),
      );

      then('the result set = current ∖ {mechanic, reviewer}', () => {
        expect(getLinkedSetSorted({ context })).toEqual(['ehmpathy/behaver']);
      });

      then('both removed roles are reported', () => {
        expect(result.rolesRemoved).toEqual([
          { repo: 'ehmpathy', role: 'mechanic' },
          { repo: 'ehmpathy', role: 'reviewer' },
        ]);
      });
    });
  });

  given('[case3] a remove of an absent role (e2 idempotent)', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'setIncrementalRoles-absent',
    });
    const context = new ContextCli({
      cwd: testDir.path,
      gitroot: testDir.path,
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(resolve(testDir.path, 'src.md'), '# source');
      setMockLinkedRole({
        agentDir: resolve(testDir.path, '.agent'),
        repo: 'ehmpathy',
        role: 'mechanic',
        sourceReadme: resolve(testDir.path, 'src.md'),
      });
    });
    afterAll(() => testDir.teardown());

    when('[t0] an unlinked role is removed', () => {
      const result = useThen('applies as a no-op', async () =>
        setIncrementalRoles(
          { additions: [], subtractions: ['nonesuch'] },
          context,
        ),
      );

      then('the current set is unchanged', () => {
        expect(getLinkedSetSorted({ context })).toEqual(['ehmpathy/mechanic']);
      });

      then('no role is reported removed', () => {
        expect(result.rolesRemoved).toEqual([]);
      });
    });
  });

  given('[case4] removing the last role empties the set (e4, e12)', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'setIncrementalRoles-empty',
    });
    const context = new ContextCli({
      cwd: testDir.path,
      gitroot: testDir.path,
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(resolve(testDir.path, 'src.md'), '# source');
      setMockLinkedRole({
        agentDir: resolve(testDir.path, '.agent'),
        repo: 'ehmpathy',
        role: 'mechanic',
        sourceReadme: resolve(testDir.path, 'src.md'),
      });
    });
    afterAll(() => testDir.teardown());

    when('[t0] the only role is removed', () => {
      const result = useThen('applies the removal', async () =>
        setIncrementalRoles(
          { additions: [], subtractions: ['mechanic'] },
          context,
        ),
      );

      then('the set is empty', () => {
        expect(getLinkedSetSorted({ context })).toEqual([]);
      });

      then('the now-empty repo dir is cleaned', () => {
        expect(
          existsSync(resolve(testDir.path, '.agent', 'repo=ehmpathy')),
        ).toEqual(false);
      });

      then('the removed role is reported', () => {
        expect(result.rolesRemoved).toEqual([
          { repo: 'ehmpathy', role: 'mechanic' },
        ]);
      });
    });
  });

  given('[case6] the summary tree output (snapshot)', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'setIncrementalRoles-summary',
    });
    const context = new ContextCli({
      cwd: testDir.path,
      gitroot: testDir.path,
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(resolve(testDir.path, 'src.md'), '# source');
      const agentDir = resolve(testDir.path, '.agent');
      const sourceReadme = resolve(testDir.path, 'src.md');
      setMockLinkedRole({
        agentDir,
        repo: 'ehmpathy',
        role: 'mechanic',
        sourceReadme,
      });
      setMockLinkedRole({
        agentDir,
        repo: 'ehmpathy',
        role: 'behaver',
        sourceReadme,
      });
      setMockLinkedRole({
        agentDir,
        repo: 'ehmpathy',
        role: 'reviewer',
        sourceReadme,
      });
    });
    afterAll(() => testDir.teardown());

    when('[t0] a role is removed', () => {
      then(
        'the tree reports subtractions + untouched count deterministically',
        async () => {
          // spy (not mock) on console.log; read jest's own call log (no local mutation)
          const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
          await setIncrementalRoles(
            { additions: [], subtractions: ['reviewer'] },
            context,
          );
          const output = spy.mock.calls
            .map((args) => args.join(' '))
            .join('\n');
          spy.mockRestore();

          // explicit assertions (functional verification) alongside the snapshot
          expect(output).toContain('🔧 init roles (incremental)');
          // no additions this call → the additions subtree is dropped
          expect(output).not.toContain('additions');
          expect(output).toContain('subtractions');
          expect(output).toContain('- ehmpathy/reviewer');
          expect(output).toContain('untouched (2)');

          // snapshot the tree from the 🔧 marker for visual regression detection
          const marker = '🔧 init roles (incremental)';
          const tree = output.slice(output.indexOf(marker));
          expect(tree).toMatchSnapshot();
        },
      );
    });
  });

  given(
    '[case6b] the summary tree output for a multi-remove (snapshot)',
    () => {
      const testDir = genTestTempDir({
        base: __dirname,
        name: 'setIncrementalRoles-summary-multi',
      });
      const context = new ContextCli({
        cwd: testDir.path,
        gitroot: testDir.path,
      });

      beforeAll(() => {
        testDir.setup();
        writeFileSync(resolve(testDir.path, 'src.md'), '# source');
        const agentDir = resolve(testDir.path, '.agent');
        const sourceReadme = resolve(testDir.path, 'src.md');
        setMockLinkedRole({
          agentDir,
          repo: 'ehmpathy',
          role: 'mechanic',
          sourceReadme,
        });
        setMockLinkedRole({
          agentDir,
          repo: 'ehmpathy',
          role: 'behaver',
          sourceReadme,
        });
        setMockLinkedRole({
          agentDir,
          repo: 'ehmpathy',
          role: 'reviewer',
          sourceReadme,
        });
      });
      afterAll(() => testDir.teardown());

      when('[t0] two roles are removed in one call', () => {
        then(
          'the tree lists both removed and the untouched remainder',
          async () => {
            const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
            await setIncrementalRoles(
              { additions: [], subtractions: ['mechanic', 'reviewer'] },
              context,
            );
            const output = spy.mock.calls
              .map((args) => args.join(' '))
              .join('\n');
            spy.mockRestore();

            // explicit assertions alongside the snapshot
            expect(output).not.toContain('additions');
            expect(output).toContain('subtractions');
            expect(output).toContain('- ehmpathy/mechanic');
            expect(output).toContain('- ehmpathy/reviewer');
            expect(output).toContain('untouched (1)');

            const marker = '🔧 init roles (incremental)';
            const tree = output.slice(output.indexOf(marker));
            expect(tree).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[case6c] the summary tree output when the set empties (snapshot)',
    () => {
      const testDir = genTestTempDir({
        base: __dirname,
        name: 'setIncrementalRoles-summary-empty',
      });
      const context = new ContextCli({
        cwd: testDir.path,
        gitroot: testDir.path,
      });

      beforeAll(() => {
        testDir.setup();
        writeFileSync(resolve(testDir.path, 'src.md'), '# source');
        setMockLinkedRole({
          agentDir: resolve(testDir.path, '.agent'),
          repo: 'ehmpathy',
          role: 'mechanic',
          sourceReadme: resolve(testDir.path, 'src.md'),
        });
      });
      afterAll(() => testDir.teardown());

      when('[t0] the only role is removed', () => {
        then(
          'the tree shows the removal and an untouched count of zero',
          async () => {
            const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
            await setIncrementalRoles(
              { additions: [], subtractions: ['mechanic'] },
              context,
            );
            const output = spy.mock.calls
              .map((args) => args.join(' '))
              .join('\n');
            spy.mockRestore();

            // explicit assertions alongside the snapshot
            expect(output).not.toContain('additions');
            expect(output).toContain('subtractions');
            expect(output).toContain('- ehmpathy/mechanic');
            expect(output).toContain('untouched (0)');

            const marker = '🔧 init roles (incremental)';
            const tree = output.slice(output.indexOf(marker));
            expect(tree).toMatchSnapshot();
          },
        );
      });
    },
  );

  given('[case5] the same slug linked under two repos (e8)', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'setIncrementalRoles-ambiguous',
    });
    const context = new ContextCli({
      cwd: testDir.path,
      gitroot: testDir.path,
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(resolve(testDir.path, 'src.md'), '# source');
      const agentDir = resolve(testDir.path, '.agent');
      const sourceReadme = resolve(testDir.path, 'src.md');
      setMockLinkedRole({
        agentDir,
        repo: 'ehmpathy',
        role: 'reviewer',
        sourceReadme,
      });
      setMockLinkedRole({
        agentDir,
        repo: 'bhuild',
        role: 'reviewer',
        sourceReadme,
      });
    });
    afterAll(() => testDir.teardown());

    when('[t0] the slug is removed without a repo qualifier', () => {
      then('throws BadRequestError about ambiguity', async () => {
        const error = await getError(() =>
          setIncrementalRoles(
            { additions: [], subtractions: ['reviewer'] },
            context,
          ),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('ambiguous');
      });
    });

    when('[t1] the slug is removed with a repo qualifier', () => {
      const result = useThen('applies the qualified removal', async () =>
        setIncrementalRoles(
          { additions: [], subtractions: ['bhuild/reviewer'] },
          context,
        ),
      );

      then('only the qualified repo role is removed', () => {
        expect(getLinkedSetSorted({ context })).toEqual(['ehmpathy/reviewer']);
      });

      then('the qualified role is reported removed', () => {
        expect(result.rolesRemoved).toEqual([
          { repo: 'bhuild', role: 'reviewer' },
        ]);
      });
    });
  });

  /**
   * .what = property-style set-math over several fixtures (the removal half)
   * .why = the vision requires a proof that `target = current ∖ removes` holds
   *   as a relation over many current-set + remove-token combinations, not just
   *   a few hand-picked scenarios. the add half (`∪ adds`) needs real linkable
   *   packages, so it is proven at acceptance grain; here we exhaust the
   *   remove-side relation the bare-fixture integration env can express.
   */
  describe('property: target = current ∖ removes', () => {
    const PROPERTY_CASES = [
      {
        slug: 'p1-single-remove',
        current: [
          ['ehmpathy', 'mechanic'],
          ['ehmpathy', 'behaver'],
          ['ehmpathy', 'reviewer'],
        ],
        removes: ['reviewer'],
        expected: ['ehmpathy/behaver', 'ehmpathy/mechanic'],
      },
      {
        slug: 'p2-multi-remove',
        current: [
          ['ehmpathy', 'mechanic'],
          ['ehmpathy', 'behaver'],
          ['ehmpathy', 'reviewer'],
        ],
        removes: ['mechanic', 'reviewer'],
        expected: ['ehmpathy/behaver'],
      },
      {
        slug: 'p3-empty-removes',
        current: [
          ['ehmpathy', 'mechanic'],
          ['ehmpathy', 'behaver'],
        ],
        removes: [],
        expected: ['ehmpathy/behaver', 'ehmpathy/mechanic'],
      },
      {
        slug: 'p4-remove-to-empty',
        current: [['ehmpathy', 'mechanic']],
        removes: ['mechanic'],
        expected: [],
      },
      {
        slug: 'p5-qualified-remove-across-repos',
        current: [
          ['ehmpathy', 'mechanic'],
          ['bhuild', 'behaver'],
        ],
        removes: ['ehmpathy/mechanic'],
        expected: ['bhuild/behaver'],
      },
      {
        slug: 'p6-remove-absent-is-noop',
        current: [['ehmpathy', 'mechanic']],
        removes: ['reviewer'],
        expected: ['ehmpathy/mechanic'],
      },
    ] as const;

    PROPERTY_CASES.forEach((propertyCase) => {
      given(
        `[${propertyCase.slug}] removes=[${propertyCase.removes.join(',')}]`,
        () => {
          const testDir = genTestTempDir({
            base: __dirname,
            name: `setIncrementalRoles-property-${propertyCase.slug}`,
          });
          const context = new ContextCli({
            cwd: testDir.path,
            gitroot: testDir.path,
          });

          beforeAll(() => {
            testDir.setup();
            writeFileSync(resolve(testDir.path, 'src.md'), '# source');
            const agentDir = resolve(testDir.path, '.agent');
            const sourceReadme = resolve(testDir.path, 'src.md');
            for (const [repo, role] of propertyCase.current)
              setMockLinkedRole({ agentDir, repo, role, sourceReadme });
          });
          afterAll(() => testDir.teardown());

          when('[t0] the removes are applied', () => {
            const result = useThen('applies the removals', async () =>
              setIncrementalRoles(
                { additions: [], subtractions: [...propertyCase.removes] },
                context,
              ),
            );

            then('the target set = current ∖ removes', () => {
              expect(getLinkedSetSorted({ context })).toEqual(
                propertyCase.expected,
              );
            });

            then('exactly the present removed roles are reported', () => {
              // the reported set is current ∩ removes (absent removes are no-ops)
              const reported = result.rolesRemoved
                .map((r) => `${r.repo}/${r.role}`)
                .sort();
              const currentSet = propertyCase.current.map(
                ([repo, role]) => `${repo}/${role}`,
              );
              const expectedReported = currentSet
                .filter((rr) => !propertyCase.expected.includes(rr as never))
                .sort();
              expect(reported).toEqual(expectedReported);
            });
          });
        },
      );
    });
  });

  /**
   * .what = the set-math is independent of `--mode` (e15) at the domain grain
   * .why = the vision lists e15 under integration tests. `setIncrementalRoles`
   *   takes NO mode input — mode governs only the CLI absolute path + link step,
   *   never the incremental set-math. so mode-independence is *structural*: the
   *   op cannot observe mode, hence its result is identical whatever the mode.
   *   this test proves that structurally — the same (adds, removes) over the same
   *   starting set yields the same target set on two independent runs. the CLI
   *   end-to-end proof (real `--mode findsert` vs `--mode upsert`) is case17 of
   *   the acceptance suite.
   */
  given('[e15] mode-independence of the incremental set-math', () => {
    const testDirA = genTestTempDir({
      base: __dirname,
      name: 'setIncrementalRoles-mode-a',
    });
    const testDirB = genTestTempDir({
      base: __dirname,
      name: 'setIncrementalRoles-mode-b',
    });
    const contextA = new ContextCli({
      cwd: testDirA.path,
      gitroot: testDirA.path,
    });
    const contextB = new ContextCli({
      cwd: testDirB.path,
      gitroot: testDirB.path,
    });

    beforeAll(() => {
      for (const dir of [testDirA, testDirB]) {
        dir.setup();
        writeFileSync(resolve(dir.path, 'src.md'), '# source');
        const agentDir = resolve(dir.path, '.agent');
        const sourceReadme = resolve(dir.path, 'src.md');
        setMockLinkedRole({
          agentDir,
          repo: 'ehmpathy',
          role: 'mechanic',
          sourceReadme,
        });
        setMockLinkedRole({
          agentDir,
          repo: 'ehmpathy',
          role: 'reviewer',
          sourceReadme,
        });
      }
    });
    afterAll(() => {
      testDirA.teardown();
      testDirB.teardown();
    });

    when('[t0] identical removes are applied to two identical sets', () => {
      const resultA = useThen('run A applies', async () =>
        setIncrementalRoles(
          { additions: [], subtractions: ['reviewer'] },
          contextA,
        ),
      );
      const resultB = useThen('run B applies', async () =>
        setIncrementalRoles(
          { additions: [], subtractions: ['reviewer'] },
          contextB,
        ),
      );

      then('both yield the identical target set (mode cannot sway it)', () => {
        expect(getLinkedSetSorted({ context: contextA })).toEqual([
          'ehmpathy/mechanic',
        ]);
        expect(getLinkedSetSorted({ context: contextB })).toEqual(
          getLinkedSetSorted({ context: contextA }),
        );
      });

      then('both report the same removed role', () => {
        expect(resultB.rolesRemoved).toEqual(resultA.rolesRemoved);
      });
    });
  });
});
