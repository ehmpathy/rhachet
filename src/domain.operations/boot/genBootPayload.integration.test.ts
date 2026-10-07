import { ConstraintError } from 'helpful-errors';
import { genTempDir, getError, given, then, useThen, when } from 'test-fns';

import {
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { genBootPayload } from './genBootPayload';
import { getOneBootSource } from './getOneBootSource';

/**
 * .what = clamps what an ABSENT spec means, per source
 * .why = the two answers are opposite, and one of them is a silent downgrade if it leaks
 *        into the other. a role's `boot.yml` may legitimately be absent — that is say-all.
 *        a DECLARED manifest was proved to be a file by `getOneBootSource` (requirement 5),
 *        so an absence at read time is a vanish, and to fall back to say-all there would
 *        render a payload the caller never asked for (`rule.forbid.hidden-side-effects`).
 *
 * 🔴 .note = this is the one check-then-read race in the feature a test CAN drive. the pair
 *   spans two operations rather than two syscalls, so the window is the test's to open:
 *   look the source up, delete the file, then assemble. `readOneBootSpecFile`'s own race
 *   has no such window — three syscalls on one path — and says so.
 */
describe('genBootPayload (integration)', () => {
  const testDir = genTempDir({ slug: 'genBootPayload' });

  /**
   * .what = a manifest, looked up while present and assembled after it is gone
   */
  const genOneVanishedManifestSource = (input: { slug: string }) => {
    const dirRoute = resolve(testDir, input.slug);
    mkdirSync(dirRoute, { recursive: true });
    writeFileSync(resolve(dirRoute, 'boot.yml'), 'always:\n  briefs:\n');
    writeFileSync(resolve(dirRoute, 'a.md'), '# a brief');

    const source = getOneBootSource({
      from: { manifest: { path: resolve(dirRoute, 'boot.yml') } },
      ifPresent: false,
      cwd: testDir,
    });

    // 🔴 the window. a rebase, a `pnpm install`, or an editor that rewrites via unlink+create
    //    is exactly this, and it lands between the lookup above and the assembly below
    rmSync(resolve(dirRoute, 'boot.yml'));

    return source;
  };

  given('[case1] a DECLARED manifest that vanishes after the lookup', () => {
    when('[t0] the payload is assembled', () => {
      then(
        'it refuses — a named spec is never say-all by default',
        async () => {
          // 🔴 without the `specIsDeclared` arm this returns a payload built from a null
          //    config, which renders the whole route dir as say — a payload the caller never
          //    declared, at a cost no budget was checked against
          const source = genOneVanishedManifestSource({ slug: 'declared' });

          const error = await getError(
            genBootPayload({ source: source!, subjects: null }),
          );

          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('vanished');
        },
      );
    });
  });

  given('[case2] a ROLE whose boot.yml was never there', () => {
    const dirRepo = resolve(testDir, 'roleless');
    const dirRole = resolve(dirRepo, '.agent/repo=.this/role=any');

    when('[t0] the payload is assembled', () => {
      then(
        'it renders say-all — the legitimate fallback, untouched',
        async () => {
          mkdirSync(resolve(dirRole, 'briefs'), { recursive: true });
          writeFileSync(resolve(dirRole, 'briefs/one.md'), '# one');

          const source = getOneBootSource({
            from: { role: { slugRepo: '.this', slugRole: 'any' } },
            ifPresent: false,
            cwd: dirRepo,
          });

          // 🔴 the bound from BELOW. the repair must not make an absent spec fatal for a role,
          //    or every role that ships no `boot.yml` stops to boot at all
          const payload = await genBootPayload({
            source: source!,
            subjects: null,
          });

          expect(payload).not.toEqual(null);
          expect(payload!.budget).toEqual(null);
        },
      );
    });
  });

  /**
   * .what = clamps that ONE spec costs ONE number, whichever arm boots it
   * .why = the budget gates the count, so one spec must count the same via `--what` and via
   *        `--repo/--role` (requirement 1 parity)
   * .note = the fixture is ref-dominated: the arms could part only on files the spec did not match
   * .note = it compares stats, not bodies; the arms label a resource differently by design
   */
  given('[case5] one spec, booted by BOTH arms', () => {
    const dirRepo = resolve(testDir, 'two-arms');
    const dirRole = resolve(dirRepo, '.agent/repo=.this/role=any');

    const genOnePayloadPerArm = async () => {
      mkdirSync(resolve(dirRole, 'briefs'), { recursive: true });
      mkdirSync(resolve(dirRole, 'refs'), { recursive: true });
      writeFileSync(
        resolve(dirRole, 'boot.yml'),
        ['always:', '  briefs:', '    say:', "      - 'core.md'"].join('\n'),
      );
      writeFileSync(
        resolve(dirRole, 'briefs/core.md'),
        '# core\n\nthe one this spec says.',
      );
      writeFileSync(
        resolve(dirRole, 'briefs/other.md'),
        '# other\n\nunmatched by the say glob, so it lands in the ref roster.',
      );

      // outside `briefs/` but inside the spec's own dir — the files both arms must exclude
      writeFileSync(
        resolve(dirRole, 'refs/outside-a.md'),
        '# outside a\n\nbeside the spec, and beneath no briefs dir.',
      );
      writeFileSync(
        resolve(dirRole, 'refs/outside-b.md'),
        '# outside b\n\na second, so the gap between the arms is two rather than one.',
      );

      const sourceViaRole = getOneBootSource({
        from: { role: { slugRepo: '.this', slugRole: 'any' } },
        ifPresent: false,
        cwd: dirRepo,
      });
      const sourceViaManifest = getOneBootSource({
        from: { manifest: { path: resolve(dirRole, 'boot.yml') } },
        ifPresent: false,
        cwd: dirRepo,
      });

      return {
        viaRole: await genBootPayload({
          source: sourceViaRole!,
          subjects: null,
        }),
        viaManifest: await genBootPayload({
          source: sourceViaManifest!,
          subjects: null,
        }),
      };
    };

    when('[t0] each arm assembles the same file', () => {
      /**
       * .what = ONE fixture write, TWO assemblies — the pair every `then` below reads
       * .why = one pair serves every facet; each assembly writes five fixture files
       *        (`rule.forbid.redundant-expensive-operations`)
       */
      const arms = useThen('each arm assembles', async () => {
        const asShape = (payload: { batches: { kind: 'say' | 'ref' }[] }) =>
          payload.batches.map((batch) => batch.kind);

        const asSaidContent = (payload: {
          batches: { kind: 'say' | 'ref'; lines: string[] }[];
        }): string =>
          payload.batches
            .filter((batch) => batch.kind === 'say')
            // the label rides the OPENING tag of each batch; the rest is the file's bytes
            .flatMap((batch) => batch.lines.slice(1))
            .join('\n');

        const { viaRole, viaManifest } = await genOnePayloadPerArm();
        return {
          statsViaRole: viaRole!.genStatsLines({ counted: null }),
          statsViaManifest: viaManifest!.genStatsLines({ counted: null }),
          countBatchesRefViaRole: viaRole!.batches.filter(
            (batch) => batch.kind === 'ref',
          ).length,
          shapeViaRole: asShape(viaRole!),
          shapeViaManifest: asShape(viaManifest!),
          saidViaRole: asSaidContent(viaRole!),
          saidViaManifest: asSaidContent(viaManifest!),
        };
      });

      then('🔴 the two arms render the SAME stats block', () => {
        // 🔴 the teeth: the stats block carries counts alone — no path, so no label
        //    difference could mask a real divergence between the two arms
        expect(arms.statsViaRole).toEqual(arms.statsViaManifest);
      });

      then('and the ref roster is NON-EMPTY — so the clamp has teeth', () => {
        // a spec with no unmatched file agrees across both arms regardless, so an empty
        // roster would make the row above pass without a real test of the divergence
        expect(arms.countBatchesRefViaRole).toBeGreaterThan(0);
      });

      then('🔴 the two arms bill the same BATCH SHAPE', () => {
        // 🔴 the resource set, by kind and count — the shape the remedy ladder operates on,
        //    and the one that diverged. a `say`-vs-`ref` disagreement is exactly a spec
        //    under its cap at one gate and over it at another
        expect(arms.shapeViaRole).toEqual(arms.shapeViaManifest);
      });

      /**
       * .what = pins that the two arms differ by label alone
       * .why = a manifest has no `repo=`/`role=` coordinates, so the two arms label a
       *        resource differently; the said content with labels stripped agrees
       */
      then(
        'and the ONLY residual is the label — the manifest carries none',
        () => {
          expect(arms.saidViaRole).toEqual(arms.saidViaManifest);
        },
      );
    });
  });

  /**
   * .what = clamps that a DAG under a role tree is billed ONCE — one file on disk, one charge
   * .why = a dir reachable by two routes yields one file under two paths (`getAllFilesFromDir`
   *        `[case3]`); the payload dedupes via `getAllFilesOncePerRealPath` so the double route
   *        never doubles the charge
   */
  given(
    '[case3] a role tree where one brief dir is reachable by two routes',
    () => {
      const dirRepo = resolve(testDir, 'dag-billed');
      const dirRole = resolve(dirRepo, '.agent/repo=.this/role=any');
      const dirBriefs = resolve(dirRole, 'briefs');

      const genOnePayloadForAliasedTree = async () => {
        mkdirSync(resolve(dirBriefs, 'shared'), { recursive: true });
        writeFileSync(
          resolve(dirBriefs, 'shared/once.md'),
          '# once, and only once on disk',
        );

        // a second, NON-CYCLIC route to the same real dir — neither is an ancestor of the
        // other, so the cycle guard does not fire and the walk descends both
        if (!existsSync(resolve(dirBriefs, 'alias')))
          symlinkSync(
            resolve(dirBriefs, 'shared'),
            resolve(dirBriefs, 'alias'),
          );

        const source = getOneBootSource({
          from: { role: { slugRepo: '.this', slugRole: 'any' } },
          ifPresent: false,
          cwd: dirRepo,
        });

        return await genBootPayload({ source: source!, subjects: null });
      };

      when('[t0] the payload is assembled', () => {
        /**
         * .what = ONE assembly over the aliased tree — the three facets every `then` reads
         * .why = one walk of the DAG serves every facet
         *        (`rule.forbid.redundant-expensive-operations`)
         */
        const aliased = useThen('it assembles', async () => {
          const payload = await genOnePayloadForAliasedTree();
          return {
            lineFiles: payload!
              .genStatsLines({ counted: null })
              .find((line) => line.includes('files =')),
            linesWithContent: payload!.linesBody.filter((line) =>
              line.includes('once, and only once on disk'),
            ),
            labels: payload!.linesBody.filter((line) =>
              line.includes('once.md'),
            ),
          };
        });

        then('the stats bill ONE file for the one on disk', () => {
          // 🔴 the headline: `files` reports the inode count, never the route count
          expect(aliased.lineFiles).toContain('files = 1');
        });

        then(
          'the body carries the content ONCE, so the tokens do not double',
          () => {
            // 🔴 the gate counts the exact emitted string, so duplicate content in the body
            //    really costs twice — against a cap that halts on tokens no reader could use
            expect(aliased.linesWithContent).toHaveLength(1);
          },
        );

        /**
         * 🔴 the survivor CHOICE is a separate property from the count: the label must be
         *   the same on every machine (`rule.require.snapshot-verified-on-independent-run`).
         *
         * 🟡 `alias/` sorts before `shared/`, so the ALIAS is what survives here. that is
         *   correct rather than merely tolerated: both paths open the same bytes, and the
         *   alias sits inside the role's own tree where a realpath might not.
         */
        then(
          'the label that survives is the FIRST by sort — never the disk order',
          () => {
            expect(aliased.labels).toHaveLength(1);
            expect(aliased.labels[0]).toContain('alias/once.md');
            expect(aliased.labels[0]).not.toContain('shared/once.md');
          },
        );
      });
    },
  );
});
