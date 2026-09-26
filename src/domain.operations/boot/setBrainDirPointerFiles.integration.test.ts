import { ConstraintError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';

import {
  lstatSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { BRAIN_DIR_AGENTS_MD_CONTENT } from './constants';
import { setBrainDirPointerFiles } from './setBrainDirPointerFiles';

describe('setBrainDirPointerFiles', () => {
  given('[case1] an empty brain dir', () => {
    when('[t0] the pointer files are set', () => {
      then(
        'AGENTS.md is @boot.md, CLAUDE.md links to it, and no reset is reported',
        () => {
          const brainDir = genTempDir({ slug: 'setBrainDirPointerFiles-c1t0' });

          const result = setBrainDirPointerFiles({ brainDir });

          expect(result.agentsMdReset).toEqual(false);
          expect(readFileSync(join(brainDir, 'AGENTS.md'), 'utf8')).toEqual(
            BRAIN_DIR_AGENTS_MD_CONTENT,
          );
          expect(
            lstatSync(join(brainDir, 'CLAUDE.md')).isSymbolicLink(),
          ).toEqual(true);
          expect(readlinkSync(join(brainDir, 'CLAUDE.md'))).toEqual(
            'AGENTS.md',
          );
        },
      );
    });

    when('[t1] the pointer files are set twice', () => {
      then('the second call is a no-op with no reset', () => {
        const brainDir = genTempDir({ slug: 'setBrainDirPointerFiles-c1t1' });
        setBrainDirPointerFiles({ brainDir });

        expect(setBrainDirPointerFiles({ brainDir }).agentsMdReset).toEqual(
          false,
        );
        expect(readlinkSync(join(brainDir, 'CLAUDE.md'))).toEqual('AGENTS.md');
      });
    });
  });

  given('[case2] a hand-edited AGENTS.md', () => {
    when('[t0] the pointer files are set', () => {
      then('AGENTS.md is reset and the reset is reported', () => {
        const brainDir = genTempDir({ slug: 'setBrainDirPointerFiles-c2t0' });
        writeFileSync(join(brainDir, 'AGENTS.md'), '@boot.md\nmy own note\n');

        const result = setBrainDirPointerFiles({ brainDir });

        expect(result.agentsMdReset).toEqual(true);
        expect(readFileSync(join(brainDir, 'AGENTS.md'), 'utf8')).toEqual(
          BRAIN_DIR_AGENTS_MD_CONTENT,
        );
      });
    });
  });

  given('[case3] a CLAUDE.md file already there', () => {
    when('[t0] the pointer files are set', () => {
      then(
        'a ConstraintError names the path, and the file is untouched',
        async () => {
          const brainDir = genTempDir({ slug: 'setBrainDirPointerFiles-c3t0' });
          writeFileSync(join(brainDir, 'CLAUDE.md'), 'a human file');

          const error = await getError(async () =>
            setBrainDirPointerFiles({ brainDir }),
          );

          expect(error).toBeInstanceOf(ConstraintError);
          expect(JSON.stringify(error)).toContain(join(brainDir, 'CLAUDE.md'));
          expect(readFileSync(join(brainDir, 'CLAUDE.md'), 'utf8')).toEqual(
            'a human file',
          );
        },
      );
    });
  });

  given('[case4] a CLAUDE.md symlink to a foreign target', () => {
    when('[t0] the pointer files are set', () => {
      then(
        'a ConstraintError names the foreign target, and the link is untouched',
        async () => {
          const brainDir = genTempDir({ slug: 'setBrainDirPointerFiles-c4t0' });
          symlinkSync('elsewhere.md', join(brainDir, 'CLAUDE.md'));

          const error = await getError(async () =>
            setBrainDirPointerFiles({ brainDir }),
          );

          expect(error).toBeInstanceOf(ConstraintError);
          expect(JSON.stringify(error)).toContain('a symlink to elsewhere.md');
          expect(readlinkSync(join(brainDir, 'CLAUDE.md'))).toEqual(
            'elsewhere.md',
          );
        },
      );
    });
  });
});
