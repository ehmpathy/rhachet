import { given, then, when } from 'test-fns';

import { asBootDelta } from './asBootDelta';

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

describe('asBootDelta', () => {
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
      then('it names each block that drifted, by kind', () => {
        const delta = asBootDelta({ bootSpawned: BOOT_SPAWNED, bootCurrent });
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
          const delta = asBootDelta({ bootSpawned: BOOT_SPAWNED, bootCurrent });
          expect(delta.drift).toMatch(/^[0-9a-f]{16}$/);
          expect(delta.markdown).toContain(`\ndrift = ${delta.drift}\n`);
          expect(delta.markdown?.endsWith('\n')).toEqual(true);
          expect(delta.lines).toEqual(
            delta.markdown!.trimEnd().split('\n').length,
          );
        },
      );

      then('the same two boots render the same bytes', () => {
        const first = asBootDelta({ bootSpawned: BOOT_SPAWNED, bootCurrent });
        const second = asBootDelta({ bootSpawned: BOOT_SPAWNED, bootCurrent });
        expect(second.markdown).toEqual(first.markdown);
      });

      then('the rendered delta matches snapshot', () => {
        const delta = asBootDelta({ bootSpawned: BOOT_SPAWNED, bootCurrent });
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

  given('[case4] the boot changed only outside every brief block', () => {
    const bootCurrent = `<!-- cache boundary -->\n${BOOT_SPAWNED}`;

    when('[t0] the delta is computed', () => {
      then(
        'it is never empty: the residual section names the change and the cure',
        () => {
          const delta = asBootDelta({ bootSpawned: BOOT_SPAWNED, bootCurrent });
          expect(delta.counts).toEqual({ changed: 0, added: 0, removed: 0 });
          expect(delta.outside).toEqual(true);
          expect(delta.markdown).toContain('## outside the briefs');
          expect(delta.markdown).toContain('<!-- cache boundary -->');
          expect(delta.markdown).toContain('respawn to take it');
        },
      );

      then('the rendered delta matches snapshot', () => {
        const delta = asBootDelta({ bootSpawned: BOOT_SPAWNED, bootCurrent });
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
});
