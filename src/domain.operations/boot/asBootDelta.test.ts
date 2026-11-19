import { given, then, when } from 'test-fns';

import { asBootDelta } from './asBootDelta';
import { BOOT_DRIFT_CARRY_LINES_MAX } from './BOOT_DRIFT_CARRY_LINES_MAX';

const BOOT_SPAWNED = [
  '<brief.say path="rhachet/intro">',
  '# rhachet',
  '</brief.say>',
  '',
  '<brief.say path=".agent/repo=.this/role=any/briefs/surf.md">',
  'paddle out at dawn',
  '</brief.say>',
  '',
  '<brief.ref path=".agent/repo=.this/role=any/briefs/wax.md"/>',
  '',
  '<also>',
  '  <skill.ref path=".agent/repo=.this/role=any/skills/tide.sh"/>',
  '</also>',
  '',
].join('\n');

/**
 * .what = the delta of a boot that gained one brief of `bodyLines` lines
 * .why = one block, sized line by line, steps the drift's size by one, so a test can land on
 *        either side of the carry cap exactly
 */
const asDeltaOfOneAddedBrief = (input: { bodyLines: number }) =>
  asBootDelta({
    bootSpawned: BOOT_SPAWNED,
    bootCurrent: [
      BOOT_SPAWNED,
      '<brief.say path=".agent/repo=.this/role=any/briefs/swell.md">',
      ...Array.from({ length: input.bodyLines }, (_, l) => `swell line ${l}`),
      '</brief.say>',
      '',
    ].join('\n'),
  });

describe('asBootDelta', () => {
  given('[case8] a drift at the carry cap, and one line past it', () => {
    // the drift's size is a fixed lead plus the block's own lines, so derive the body that lands on the cap
    const base = asDeltaOfOneAddedBrief({ bodyLines: 1 }).lines - 1;
    const atCap = asDeltaOfOneAddedBrief({
      bodyLines: BOOT_DRIFT_CARRY_LINES_MAX - base,
    });
    const pastCap = asDeltaOfOneAddedBrief({
      bodyLines: BOOT_DRIFT_CARRY_LINES_MAX - base + 1,
    });

    when('[t0] the drift is exactly the cap', () => {
      then('it carries the body whole', () => {
        expect(atCap.lines).toEqual(BOOT_DRIFT_CARRY_LINES_MAX);
        expect(atCap.capped).toEqual(false);
        expect(atCap.markdown).toContain('swell line 0');
      });
    });

    when('[t1] the drift is one line past the cap', () => {
      then('it carries the stub, and still names its size and drift', () => {
        expect(pastCap.lines).toEqual(BOOT_DRIFT_CARRY_LINES_MAX + 1);
        expect(pastCap.capped).toEqual(true);
        expect(pastCap.markdown).not.toContain('swell line 0');
        expect(pastCap.markdown).toContain(`drift = ${pastCap.drift}`);
      });
    });
  });

  given('[case1] the boot has not changed', () => {
    when('[t0] the delta is computed', () => {
      then('there is no drift to carry', () => {
        const delta = asBootDelta({
          bootSpawned: BOOT_SPAWNED,
          bootCurrent: BOOT_SPAWNED,
        });
        expect(delta.markdown).toBeNull();
        expect(delta.drift).toBeNull();
        expect(delta.lines).toEqual(0);
        expect(delta.counts).toEqual({ changed: 0, added: 0, removed: 0 });
        expect(delta.outside).toEqual(false);
      });
    });
  });

  given('[case2] one brief changed, one added, one removed', () => {
    const bootCurrent = BOOT_SPAWNED.replace(
      'paddle out at dawn',
      'paddle out at dusk',
    ).replace(
      '<brief.ref path=".agent/repo=.this/role=any/briefs/wax.md"/>',
      '<brief.ref path=".agent/repo=.this/role=any/briefs/fins.md"/>',
    );

    when('[t0] the delta is computed', () => {
      const delta = asBootDelta({ bootSpawned: BOOT_SPAWNED, bootCurrent });

      then('it names each block that drifted, by kind', () => {
        expect(delta.counts).toEqual({ changed: 1, added: 1, removed: 1 });
        expect(delta.outside).toEqual(false);
        expect(delta.markdown).toContain('paddle out at dusk');
        expect(delta.markdown).not.toContain('# rhachet');
        expect(delta.markdown).toContain(
          '- brief.ref .agent/repo=.this/role=any/briefs/wax.md',
        );
      });

      then(
        'it states its drift hash on its own line, and counts its lines',
        () => {
          expect(delta.drift).toMatch(/^[0-9a-f]{16}$/);
          expect(delta.markdown).toContain(`\ndrift = ${delta.drift}\n`);
          expect(delta.markdown?.endsWith('\n')).toEqual(true);
          expect(delta.lines).toEqual(
            delta.markdown!.trimEnd().split('\n').length,
          );
        },
      );

      then('the same two boots render the same bytes', () => {
        // .note = a second call on purpose: determinism is a claim about two calls
        const second = asBootDelta({ bootSpawned: BOOT_SPAWNED, bootCurrent });
        expect(second.markdown).toEqual(delta.markdown);
      });

      then('the rendered delta matches snapshot', () => {
        expect(delta.markdown).toMatchSnapshot();
      });
    });
  });

  given('[case3] a brief quotes a block tag mid-line', () => {
    const bootCurrent = BOOT_SPAWNED.replace(
      'paddle out at dawn',
      'paddle out at dawn; never write `<brief.say path="x">` inline',
    );

    when('[t0] the delta is computed', () => {
      then(
        'the quoted tag is body text of the changed brief, never a block',
        () => {
          const delta = asBootDelta({ bootSpawned: BOOT_SPAWNED, bootCurrent });
          expect(delta.counts).toEqual({ changed: 1, added: 0, removed: 0 });
        },
      );
    });
  });

  given(
    '[case3b] a brief quotes its close tag at a line start, and changes',
    () => {
      // the quoted close cuts the block short; the rest of the brief, and the real close, fall to
      // the residual, so the carried block cannot stand for the whole brief
      const asBoot = (input: { word: string }) =>
        BOOT_SPAWNED.replace(
          'paddle out at dawn',
          `paddle out at ${input.word}\n</brief.say>\nthe rest of the brief`,
        );

      when('[t0] the delta is computed', () => {
        then('it marks the drift outside, with respawn as the cure', () => {
          const delta = asBootDelta({
            bootSpawned: asBoot({ word: 'dawn' }),
            bootCurrent: asBoot({ word: 'dusk' }),
          });
          expect(delta.counts).toEqual({ changed: 1, added: 0, removed: 0 });
          expect(delta.outside).toEqual(true);
          expect(delta.markdown).toContain(
            'a brief quotes a close tag at a line start, so a block above may be cut short. respawn to take the whole boot.',
          );
        });
      });
    },
  );

  given('[case4] the boot changed only outside every brief block', () => {
    const bootCurrent = `<!-- cache boundary -->\n${BOOT_SPAWNED}`;

    when('[t0] the delta is computed', () => {
      const delta = asBootDelta({ bootSpawned: BOOT_SPAWNED, bootCurrent });

      then(
        'it is never empty: the residual section names the change and the cure',
        () => {
          expect(delta.counts).toEqual({ changed: 0, added: 0, removed: 0 });
          expect(delta.outside).toEqual(true);
          expect(delta.markdown).toContain('## outside the briefs');
          expect(delta.markdown).toContain('<!-- cache boundary -->');
          expect(delta.markdown).toContain('respawn to take it');
        },
      );

      then('the rendered delta matches snapshot', () => {
        expect(delta.markdown).toMatchSnapshot();
      });
    });
  });

  given('[case6] the boot changed in whitespace or block order only', () => {
    const casesShapeOnly = [
      { slug: 'a blank line added', bootCurrent: `${BOOT_SPAWNED}\n\n` },
      {
        slug: 'an indent changed outside the blocks',
        bootCurrent: BOOT_SPAWNED.replace(
          '  <skill.ref path=".agent/repo=.this/role=any/skills/tide.sh"/>',
          '    <skill.ref path=".agent/repo=.this/role=any/skills/tide.sh"/>',
        ),
      },
      {
        slug: 'two blocks swapped',
        bootCurrent: BOOT_SPAWNED.replace(
          '<brief.say path="rhachet/intro">\n# rhachet\n</brief.say>\n\n<brief.say path=".agent/repo=.this/role=any/briefs/surf.md">\npaddle out at dawn\n</brief.say>',
          '<brief.say path=".agent/repo=.this/role=any/briefs/surf.md">\npaddle out at dawn\n</brief.say>\n\n<brief.say path="rhachet/intro">\n# rhachet\n</brief.say>',
        ),
      },
    ];

    when('[t0] the delta is computed', () => {
      casesShapeOnly.map((thisCase) =>
        then(`${thisCase.slug}: it is never empty, and names respawn`, () => {
          expect(thisCase.bootCurrent).not.toEqual(BOOT_SPAWNED);
          const delta = asBootDelta({
            bootSpawned: BOOT_SPAWNED,
            bootCurrent: thisCase.bootCurrent,
          });
          expect(delta.markdown).not.toBeNull();
          expect(delta.outside).toEqual(true);
          expect(delta.markdown).toContain(
            'the boot changed in whitespace or order only',
          );
          expect(delta.markdown).toContain('respawn to take it');
        }),
      );
    });
  });

  given('[case5] a brief moved from say to ref', () => {
    const bootCurrent = BOOT_SPAWNED.replace(
      [
        '<brief.say path=".agent/repo=.this/role=any/briefs/surf.md">',
        'paddle out at dawn',
        '</brief.say>',
      ].join('\n'),
      '<brief.ref path=".agent/repo=.this/role=any/briefs/surf.md"/>',
    );

    when('[t0] the delta is computed', () => {
      then('it reads as one removed and one added, keyed by tag', () => {
        const delta = asBootDelta({ bootSpawned: BOOT_SPAWNED, bootCurrent });
        expect(delta.counts).toEqual({ changed: 0, added: 1, removed: 1 });
        expect(delta.markdown).toContain(
          '- brief.say .agent/repo=.this/role=any/briefs/surf.md',
        );
      });
    });
  });

  given('[case7] a boot the size of a real one: ~1,000 blocks, ~500KB', () => {
    // a repo actor's boot measured 534,428 bytes over 1,055 blocks; the delta runs on each
    //   render sweep and on each clone stop, so its cost must stay linear in the corpus
    const asBlock = (i: number, word: string) =>
      [
        `<brief.say path=".agent/repo=.this/role=any/briefs/rule.${i}.md">`,
        ...Array.from(
          { length: 10 },
          (_, l) => `${word} the set wave, line ${l}, and read the tide`,
        ),
        '</brief.say>',
        '',
      ].join('\n');
    const bootSpawned = Array.from({ length: 1000 }, (_, i) =>
      asBlock(i, 'ride'),
    ).join('\n');
    const bootCurrent = Array.from({ length: 1000 }, (_, i) =>
      asBlock(i, i % 100 === 0 ? 'surf' : 'ride'),
    ).join('\n');

    when('[t0] the delta is computed', () => {
      then('it names the ten changed blocks, well inside a second', () => {
        expect(bootSpawned.length).toBeGreaterThan(450_000);
        const begin = Date.now();
        const delta = asBootDelta({ bootSpawned, bootCurrent });
        const elapsed = Date.now() - begin;
        expect(delta.counts).toEqual({ changed: 10, added: 0, removed: 0 });
        expect(elapsed).toBeLessThan(1000);
      });
    });

    when('[t1] every block changed, a drift the size of the boot', () => {
      const bootRewritten = Array.from({ length: 1000 }, (_, i) =>
        asBlock(i, 'surf'),
      ).join('\n');
      const delta = asBootDelta({ bootSpawned, bootCurrent: bootRewritten });

      then('it carries a stub past the cap, never the body', () => {
        expect(delta.lines).toBeGreaterThan(BOOT_DRIFT_CARRY_LINES_MAX);
        expect((delta.markdown ?? '').split('\n').length).toBeLessThan(20);
        expect(delta.markdown).toContain(
          `past the ${BOOT_DRIFT_CARRY_LINES_MAX} line cap a compaction carries`,
        );
        expect(delta.markdown).not.toContain('<brief.say');
      });

      then('the stub still names the drift, so the nudge still fires', () => {
        expect(delta.drift).not.toBeNull();
        expect(delta.markdown).toContain(`drift = ${delta.drift}`);
        expect(delta.counts).toEqual({ changed: 1000, added: 0, removed: 0 });
      });

      then('the stub matches snapshot', () => {
        expect(delta.markdown).toMatchSnapshot();
      });
    });
  });
});
