import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';
import { getRoleDeltas } from '@src/domain.operations/roles/deltas/getRoleDeltas';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setInitRoleFoci } from './setInitRoleFoci';

/**
 * .what = a linked package role dir that declares one subject, with the spec given
 */
const setLinkedRole = (input: {
  dir: string;
  role: string;
  bootYml: string;
}): void => {
  const roleDir = join(
    input.dir,
    '.agent',
    'repo=fixturepkg',
    `role=${input.role}`,
  );
  mkdirSync(join(roleDir, 'briefs'), { recursive: true });
  writeFileSync(join(roleDir, 'briefs', 'tiny.md'), '# tiny\n');
  writeFileSync(join(roleDir, 'boot.yml'), input.bootYml);
};

const BOOT_YML_SOUND = [
  'subject.tiny:',
  '  briefs:',
  '    say:',
  '      - briefs/tiny.md',
  '',
].join('\n');

// K2: `inherits` is a key no render reads, so the spec will not parse
const BOOT_YML_UNPARSED = [
  'subject.tiny:',
  '  inherits:',
  '    always: false',
  '  briefs:',
  '    say:',
  '      - briefs/tiny.md',
  '',
].join('\n');

describe('setInitRoleFoci', () => {
  given(
    '[case1] two linked roles focused at ::tiny, one whose boot.yml will not parse',
    () => {
      const scene = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'init-role-foci-spec-unparsed' });
        setLinkedRole({ dir, role: 'sound', bootYml: BOOT_YML_SOUND });
        setLinkedRole({ dir, role: 'broken', bootYml: BOOT_YML_UNPARSED });
        return setInitRoleFoci(
          {
            deltas: getRoleDeltas({
              tokens: ['+sound::tiny', '+broken::tiny'],
            }),
            rolesLinkedBefore: ['sound', 'broken'],
          },
          new ContextCli({ cwd: dir, gitroot: dir }),
        );
      });

      when('[t0] the focus receipt is composed', () => {
        then(
          'the broken role reads as not yet in effect: it boots refs-only',
          () => {
            const leaf = scene.lines.find((line) => line.includes('broken'));
            expect(leaf).toContain(
              'which takes effect once its boot.yml is repaired',
            );
          },
        );

        then('the sound role reads as applied', () => {
          const leaf = scene.lines.find((line) => line.includes('sound'));
          expect(leaf).toBeDefined();
          expect(leaf).not.toContain('which takes effect once');
        });

        then('the receipt is locked', () => {
          expect(scene.lines.join('\n')).toMatchSnapshot();
        });
      });
    },
  );
});
