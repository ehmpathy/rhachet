import { given, then, when } from 'test-fns';

import { asBootCorpus } from './asBootCorpus';
import { BOOT_STATS_ZERO, type BootStats } from './BootStats';

const genStats = (input: Partial<BootStats>): BootStats => ({
  ...BOOT_STATS_ZERO,
  roles: 1,
  ...input,
});

describe('asBootCorpus', () => {
  given('[case1] two role contents', () => {
    when('[t0] joined', () => {
      const corpus = asBootCorpus({
        contents: [
          {
            body: 'role-b body\n',
            stats: genStats({ files: 2, briefsSay: 1, chars: 10 }),
          },
          {
            body: 'role-a body\n',
            stats: genStats({ files: 3, briefsRef: 2, chars: 7 }),
          },
        ],
      });

      then('the bodies are joined in input order', () => {
        expect(corpus.body).toEqual('role-b body\nrole-a body\n');
      });

      then('the stats are summed', () => {
        expect(corpus.stats).toEqual({
          roles: 2,
          files: 5,
          briefsSay: 1,
          briefsRef: 2,
          skillsSay: 0,
          skillsRef: 0,
          chars: 17,
        });
      });
    });
  });

  given('[case2] zero contents', () => {
    when('[t0] joined', () => {
      then('the body is empty and the stats are zero', () => {
        expect(asBootCorpus({ contents: [] })).toEqual({
          body: '',
          stats: BOOT_STATS_ZERO,
        });
      });
    });
  });

  given('[case3] one content', () => {
    when('[t0] joined', () => {
      then('the body is that content byte for byte', () => {
        const body = '<brief.say path="x">\nx\n</brief.say>\n\n';
        expect(
          asBootCorpus({ contents: [{ body, stats: genStats({}) }] }).body,
        ).toEqual(body);
      });
    });
  });
});
