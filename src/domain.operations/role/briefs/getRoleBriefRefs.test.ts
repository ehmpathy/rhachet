import { given, then, when } from 'test-fns';

import { getRoleBriefRefs } from './getRoleBriefRefs';

const briefsDir = '/role/briefs';

describe('getRoleBriefRefs', () => {
  given('[case1] all .md, no .md.min', () => {
    const briefFiles = [`${briefsDir}/a.md`, `${briefsDir}/b.md`];

    when('[t0] resolved', () => {
      const result = getRoleBriefRefs({ briefFiles, briefsDir });

      then('refs use .md as pathToOriginal with pathToMinified null', () => {
        expect(result.refs).toEqual([
          { pathToOriginal: `${briefsDir}/a.md`, pathToMinified: null },
          { pathToOriginal: `${briefsDir}/b.md`, pathToMinified: null },
        ]);
      });

      then('orphans is empty', () => {
        expect(result.orphans).toEqual([]);
      });
    });
  });

  given('[case2] all .md with .md.min counterparts', () => {
    const briefFiles = [
      `${briefsDir}/a.md`,
      `${briefsDir}/a.md.min`,
      `${briefsDir}/b.md`,
      `${briefsDir}/b.md.min`,
    ];

    when('[t0] resolved', () => {
      const result = getRoleBriefRefs({ briefFiles, briefsDir });

      then(
        'refs use .md as pathToOriginal and .md.min as pathToMinified',
        () => {
          expect(result.refs).toEqual([
            {
              pathToOriginal: `${briefsDir}/a.md`,
              pathToMinified: `${briefsDir}/a.md.min`,
            },
            {
              pathToOriginal: `${briefsDir}/b.md`,
              pathToMinified: `${briefsDir}/b.md.min`,
            },
          ]);
        },
      );

      then('orphans is empty', () => {
        expect(result.orphans).toEqual([]);
      });
    });
  });

  given('[case3] mixed: some with .md.min, some without', () => {
    const briefFiles = [
      `${briefsDir}/a.md`,
      `${briefsDir}/a.md.min`,
      `${briefsDir}/b.md`,
    ];

    when('[t0] resolved', () => {
      const result = getRoleBriefRefs({ briefFiles, briefsDir });

      then('a has pathToMinified, b has pathToMinified null', () => {
        expect(result.refs).toEqual([
          {
            pathToOriginal: `${briefsDir}/a.md`,
            pathToMinified: `${briefsDir}/a.md.min`,
          },
          { pathToOriginal: `${briefsDir}/b.md`, pathToMinified: null },
        ]);
      });

      then('orphans is empty', () => {
        expect(result.orphans).toEqual([]);
      });
    });
  });

  given('[case4] orphan .md.min (no .md source)', () => {
    const briefFiles = [`${briefsDir}/a.md.min`];

    when('[t0] resolved', () => {
      const result = getRoleBriefRefs({ briefFiles, briefsDir });

      then('refs is empty', () => {
        expect(result.refs).toEqual([]);
      });

      then('orphans contains the orphan', () => {
        expect(result.orphans).toEqual([
          { pathToMinified: `${briefsDir}/a.md.min` },
        ]);
      });
    });
  });

  given('[case5] mixed with orphan', () => {
    const briefFiles = [`${briefsDir}/a.md`, `${briefsDir}/b.md.min`];

    when('[t0] resolved', () => {
      const result = getRoleBriefRefs({ briefFiles, briefsDir });

      then('a in refs with pathToMinified null', () => {
        expect(result.refs).toEqual([
          { pathToOriginal: `${briefsDir}/a.md`, pathToMinified: null },
        ]);
      });

      then('b in orphans', () => {
        expect(result.orphans).toEqual([
          { pathToMinified: `${briefsDir}/b.md.min` },
        ]);
      });
    });
  });

  given('[case6] empty input', () => {
    const briefFiles: string[] = [];

    when('[t0] resolved', () => {
      const result = getRoleBriefRefs({ briefFiles, briefsDir });

      then('refs is empty', () => {
        expect(result.refs).toEqual([]);
      });

      then('orphans is empty', () => {
        expect(result.orphans).toEqual([]);
      });
    });
  });
});
