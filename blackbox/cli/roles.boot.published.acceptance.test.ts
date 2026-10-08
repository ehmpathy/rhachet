import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the block types THIS repo's renderer emits, and the only lines the mask keeps
 * .why = the mask keeps lines our renderer wrote and drops lines an upstream doc body wrote
 * .note = a new block type must be added here; the peer boot suites snap raw stdout
 */
const BOOT_BLOCK_TAGS = [
  'readme',
  'brief.say',
  'skill.say',
  'briefs.ref',
  'skills.ref',
  'also',
  'stats',
];

/**
 * .what = reduce a boot payload to its block SKELETON — the ordered block types, plus the
 *         `<stats>` tree with every number masked
 * .why = doc bodies and counts change on an upstream release; block order, the stats tree
 *        shape, and the `<also>` split do not (`rule.forbid.blanket-resnap-after-rebase`)
 * .note = a run of one block type collapses to a single line, so the count is not pinned
 * .note = end tags are dropped; indentation carries the `<also>` depth
 */
const asBlockSkeleton = (output: string): string => {
  const kept: string[] = [];
  let inStats = false;

  for (const raw of output.split('\n')) {
    const bare = raw.trim();
    const indent = ' '.repeat(raw.length - raw.trimStart().length);

    if (bare === '<stats>') {
      inStats = true;
      kept.push(`${indent}<stats>`);
      continue;
    }
    if (bare === '</stats>') {
      inStats = false;
      kept.push(`${indent}</stats>`);
      continue;
    }
    // inside `<stats>` the TREE is the contract and every number in it drifts, so the
    // shape is kept verbatim and each numeric run collapses to `N`
    if (inStats) {
      kept.push(raw.replace(/\d[\d,._]*/g, 'N'));
      continue;
    }

    const open = bare.match(/^<([a-z][\w.]*)(?:\s[^>]*)?>$/);
    if (open && BOOT_BLOCK_TAGS.includes(open[1]!)) {
      kept.push(`${indent}<${open[1]}>`);
      continue;
    }
    // every other line is a doc body, a ref path, or an end tag — all dropped
  }

  return kept.filter((line, index) => line !== kept[index - 1]).join('\n');
};

/**
 * .what = acceptance tests for a boot whose role comes from a PUBLISHED package
 * .why = every other boot suite reads a fixture this repo authors, so none of them can catch a
 *        defect in the one path a consumer actually walks: pnpm resolves a real tarball, `roles
 *        link` symlinks it under `.agent/`, and the renderer reads through that symlink.
 *
 * .note = the snapshot is over a masked readout. the doc bodies and counts change with each
 *   upstream release; the skeleton (block order, the stats tree, the `<also>` split) does not,
 *   so the skeleton is what is snapped.
 */
describe('rhachet with published packages', () => {
  given('[case1] repo with published rhachet + rhachet-roles-ehmpathy via pnpm', () => {
    const repo = useBeforeAll(async () => {
      // create temp repo with package.json that depends on published packages
      // pnpm install runs to fetch the real published packages
      const r = genTestTempRepo({ fixture: 'with-published-roles', install: true });
      return r;
    });

    when('[t0] roles link --repo ehmpathy --role mechanic', () => {
      const result = useBeforeAll(async () => {
        return invokeRhachetCliBinary({
          args: ['roles', 'link', '--repo', 'ehmpathy', '--role', 'mechanic'],
          cwd: repo.path,
        });
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t1] roles boot --repo ehmpathy --role mechanic', () => {
      const result = useBeforeAll(async () => {
        // first link
        invokeRhachetCliBinary({
          args: ['roles', 'link', '--repo', 'ehmpathy', '--role', 'mechanic'],
          cwd: repo.path,
          logOnError: false,
        });

        // then boot
        return invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', 'ehmpathy', '--role', 'mechanic'],
          cwd: repo.path,
        });
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it emits a rendered payload', () => {
        // `<stats>` and `quant` appear only in a rendered payload, whatever briefs upstream ships
        expect(result.stdout).toContain('<stats>');
        expect(result.stdout).toContain('quant');
      });

      then('🔴 the whole payload reaches a pipe, closed stats block and all', () => {
        // the payload exceeds the 64KB pipe buffer, and stdout is read through a pipe, as a hook
        // reads it. a truncated payload lacks its closed stats tail
        expect(result.stdout.length).toBeGreaterThan(65536);
        expect(result.stdout.trimEnd().endsWith('</stats>')).toEqual(true);
        expect(result.stdout.split('<stats>').length - 1).toEqual(2);
      });

      then('the payload came from the published ehmpathy package', () => {
        // the resource paths carry the role coordinates, so this proves the renderer read
        // THROUGH the link `roles link` made rather than from some fixture in the temp repo
        expect(result.stdout).toContain('repo=ehmpathy/role=mechanic');
      });

      then('the rendered SHAPE matches its snapshot', () => {
        // .readout = `asBlockSkeleton` over raw STDOUT — the block order plus the masked
        //   stats tree. it pins the block structure the `toContain` checks above do not
        //   (`rule.require.contract-snapshot-exhaustiveness`)
        expect(asBlockSkeleton(result.stdout)).toMatchSnapshot('skeleton');
      });
    });
  });
});
