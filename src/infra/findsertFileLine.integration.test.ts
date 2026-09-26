import { genTempDir, given, then, when } from 'test-fns';

import { findsertFileLine } from '@src/infra/findsertFileLine';

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

describe('findsertFileLine', () => {
  given('[case1] no file', () => {
    when('[t0] a line is findserted', () => {
      then('the file is created with the line alone', () => {
        const dir = genTempDir({ slug: 'findsertFileLine-c1t0' });
        const path = join(dir, '.gitignore');

        const result = findsertFileLine({ path, line: 'boot.md' });

        expect(result.effect).toEqual('CREATED');
        expect(readFileSync(path, 'utf8')).toEqual('boot.md\n');
      });
    });
  });

  given('[case2] a file without the line', () => {
    when('[t0] a line is findserted', () => {
      then(
        'the line is appended, and every other line is kept byte for byte',
        () => {
          const dir = genTempDir({ slug: 'findsertFileLine-c2t0' });
          const path = join(dir, '.gitignore');
          writeFileSync(path, '# a comment\nnode_modules/\n\n.env  \n');

          const result = findsertFileLine({ path, line: 'boot.md' });

          expect(result.effect).toEqual('APPENDED');
          expect(readFileSync(path, 'utf8')).toEqual(
            '# a comment\nnode_modules/\n\n.env  \nboot.md\n',
          );
        },
      );
    });

    when('[t1] the last line lacks a newline', () => {
      then('a newline is added before the append', () => {
        const dir = genTempDir({ slug: 'findsertFileLine-c2t1' });
        const path = join(dir, '.gitignore');
        writeFileSync(path, 'node_modules/');

        findsertFileLine({ path, line: 'boot.md' });

        expect(readFileSync(path, 'utf8')).toEqual('node_modules/\nboot.md\n');
      });
    });
  });

  given('[case3] a file that already holds the line', () => {
    when('[t0] the line is findserted again', () => {
      then('the file is unchanged', () => {
        const dir = genTempDir({ slug: 'findsertFileLine-c3t0' });
        const path = join(dir, '.gitignore');
        const before = 'node_modules/\nboot.md\n.env';
        writeFileSync(path, before);

        const result = findsertFileLine({ path, line: 'boot.md' });

        expect(result.effect).toEqual('FOUND');
        expect(readFileSync(path, 'utf8')).toEqual(before);
      });
    });

    when('[t1] only a longer line holds it as a prefix', () => {
      then('the line is still appended — the match is whole-line', () => {
        const dir = genTempDir({ slug: 'findsertFileLine-c3t1' });
        const path = join(dir, '.gitignore');
        writeFileSync(path, 'boot.md.bak\n');

        const result = findsertFileLine({ path, line: 'boot.md' });

        expect(result.effect).toEqual('APPENDED');
        expect(readFileSync(path, 'utf8')).toEqual('boot.md.bak\nboot.md\n');
      });
    });
  });
});
