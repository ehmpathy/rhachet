import { given, then, when } from 'test-fns';

import { asCloneBootDriftLines } from './asCloneBootDriftLines';

const COUNTS_NONE = { changed: 0, added: 0, removed: 0 };

describe('asCloneBootDriftLines', () => {
  given('[case1] a clone that spawned on the current boot', () => {
    when('[t0] it is inspected', () => {
      const lines = asCloneBootDriftLines({
        for: 'inspect',
        address: '@:reviewer',
        drift: {
          kind: 'current',
          revision: '0123456789abcdef',
          drift: null,
          lines: 0,
          counts: COUNTS_NONE,
          outside: false,
          capped: false,
        },
      });

      then('it says there is no drift, and names its revision', () => {
        expect(lines).toEqual([
          '😶 boot drift of @:reviewer',
          '   ├─ spawn revision = sha256=0123456789abcdef',
          '   └─ no drift; the clone holds the current boot',
        ]);
      });

      then('the tree matches snapshot', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case1b] a clone spawned before boot drift', () => {
    when('[t0] it is inspected', () => {
      const lines = asCloneBootDriftLines({
        for: 'inspect',
        address: '@:old',
        drift: { kind: 'legacy' },
      });

      then('it says the clone holds its spawn boot until a respawn', () => {
        expect(lines).toContain(
          '   └─ spawned before boot drift, so it holds its spawn boot until a respawn',
        );
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case1c] a clone spawned by a resume', () => {
    when('[t0] it is inspected', () => {
      const lines = asCloneBootDriftLines({
        for: 'inspect',
        address: '@:back',
        drift: { kind: 'resumed' },
      });

      then(
        'it says the drift is unknown and names respawn, never current',
        () => {
          expect(lines).toContain(
            '   └─ it takes no drift at any compaction; respawn it to take the current boot',
          );
          expect(lines.join('\n')).not.toContain('holds the current boot');
          expect(lines).toMatchSnapshot();
        },
      );
    });
  });

  given('[case2] a boot that changed only outside the briefs', () => {
    when('[t0] the clone is nudged', () => {
      const lines = asCloneBootDriftLines({
        for: 'nudge',
        address: '@:reviewer',
        drift: {
          kind: 'drifted',
          revision: '0123456789abcdef',
          drift: 'fedcba9876543210',
          lines: 212,
          counts: COUNTS_NONE,
          outside: true,
          capped: false,
        },
      });

      then(
        'it never reads as no drift, and names respawn as the only cure for the outside part',
        () => {
          expect(lines).toContain(
            '   ├─ no block drifted; the boot changed outside the briefs, which only a respawn takes',
          );
          expect(lines).toMatchSnapshot();
        },
      );

      then(
        'no `also` row: the outside change is the only change, said once',
        () => {
          expect(lines.join('\n')).not.toContain('also changed');
        },
      );

      then(
        'the nudge offers no /compact: it names respawn as the one way out',
        () => {
          expect(lines.join('\n')).not.toContain('/compact');
          expect(lines.at(-1)).toEqual(
            '   └─ to take it, respawn — the new boot loads whole, from the shared cache',
          );
        },
      );
    });

    when('[t1] the clone is inspected', () => {
      const lines = asCloneBootDriftLines({
        for: 'inspect',
        address: '@:reviewer',
        drift: {
          kind: 'drifted',
          revision: '0123456789abcdef',
          drift: 'fedcba9876543210',
          lines: 212,
          counts: COUNTS_NONE,
          outside: true,
          capped: false,
        },
      });

      then(
        'it names the outside change, and respawn as its one cure: a compaction takes naught of it',
        () => {
          expect(lines).toContain(
            '   ├─ no block drifted; the boot changed outside the briefs, which only a respawn takes',
          );
          expect(lines.join('\n')).not.toContain('also changed');
          expect(lines.join('\n')).not.toContain('/compact');
          expect(lines.at(-1)).toEqual(
            '   └─ 212 lines of drift, over the 200 line threshold; a compaction takes naught of it, so respawn the clone',
          );
          expect(lines).toMatchSnapshot();
        },
      );
    });
  });

  given('[case2b] a drift with no block and no outside change', () => {
    when('[t0] the clone is inspected', () => {
      const lines = asCloneBootDriftLines({
        for: 'inspect',
        address: '@:reviewer',
        drift: {
          kind: 'drifted',
          revision: '0123456789abcdef',
          drift: 'fedcba9876543210',
          lines: 4,
          counts: COUNTS_NONE,
          outside: false,
          capped: false,
        },
      });

      then('it names whitespace and order as the whole change', () => {
        expect(lines).toContain(
          '   ├─ no block drifted; the change sits in whitespace and order alone',
        );
        expect(lines.join('\n')).not.toContain('outside the briefs');
      });
    });
  });

  given(
    '[case3] a boot that changed inside a brief and outside the briefs',
    () => {
      const drift = {
        kind: 'drifted' as const,
        revision: '0123456789abcdef',
        drift: 'fedcba9876543210',
        lines: 230,
        counts: { changed: 1, added: 1, removed: 0 },
        outside: true,
        capped: false,
      };

      when('[t0] the clone is inspected', () => {
        const lines = asCloneBootDriftLines({
          for: 'inspect',
          address: '@:reviewer',
          drift,
        });

        then('it names both the blocks and the outside change', () => {
          expect(lines).toContain(
            '   ├─ 2 blocks drifted since this clone spawned (1 changed, 1 added)',
          );
          expect(lines).toContain(
            '   ├─ the boot also changed outside the briefs, which only a respawn takes',
          );
          expect(lines).toMatchSnapshot();
        });
      });

      when('[t1] the clone is nudged', () => {
        const lines = asCloneBootDriftLines({
          for: 'nudge',
          address: '@:reviewer',
          drift,
        });

        then('it names both, then the two ways out', () => {
          expect(lines).toContain(
            '   ├─ 2 blocks drifted since this clone spawned (1 changed, 1 added)',
          );
          expect(lines).toContain(
            '   ├─ the boot also changed outside the briefs, which only a respawn takes',
          );
          expect(lines).toContain('   └─ to take it');
          expect(lines).toMatchSnapshot();
        });
      });
    },
  );

  given('[case3b] a drift past the carry cap', () => {
    const drift = {
      kind: 'drifted' as const,
      revision: '0123456789abcdef',
      drift: 'fedcba9876543210',
      lines: 12034,
      counts: { changed: 1000, added: 0, removed: 0 },
      outside: false,
      capped: true,
    };

    when('[t0] the clone is nudged', () => {
      const lines = asCloneBootDriftLines({
        for: 'nudge',
        address: '@:reviewer',
        drift,
      });

      then('it never offers /compact; respawn is the one cure', () => {
        expect(lines.join('\n')).not.toContain('/compact');
        expect(lines.join('\n')).not.toContain('you should hold drift');
        expect(lines).toContain(
          '   ├─ past the 2000 line cap, the drift carries no block, so a compaction takes naught',
        );
        expect(lines.at(-1)).toContain('respawn');
        expect(lines).toMatchSnapshot();
      });
    });

    when('[t1] the clone is inspected', () => {
      const lines = asCloneBootDriftLines({
        for: 'inspect',
        address: '@:reviewer',
        drift,
      });

      then('it never reads a held drift hash as a pass', () => {
        expect(lines.join('\n')).not.toContain(
          'a compacted clone that does not hold',
        );
        expect(lines.at(-1)).toContain('only a respawn takes the current boot');
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case4] a drift of exactly the threshold', () => {
    when('[t0] the clone is inspected', () => {
      const lines = asCloneBootDriftLines({
        for: 'inspect',
        address: '@:reviewer',
        drift: {
          kind: 'drifted',
          revision: '0123456789abcdef',
          drift: 'fedcba9876543210',
          lines: 200,
          counts: { changed: 1, added: 0, removed: 0 },
          outside: false,
          capped: false,
        },
      });

      then('it reads under the threshold, as the nudge decides it', () => {
        expect(lines).toContain(
          '   ├─ 200 lines of drift, under the 200 line threshold',
        );
      });
    });
  });
});
