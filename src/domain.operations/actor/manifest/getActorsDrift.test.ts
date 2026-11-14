import { given, then, when } from 'test-fns';

import { asActorsDriftReportLines } from './asActorsDriftReportLines';
import { getActorsDrift } from './getActorsDrift';

describe('getActorsDrift', () => {
  given('[case1] a declared set and a linked set that differ both ways', () => {
    const declared = [
      { role: 'ehmpathy/mechanic', via: '@ehmpathy/builder' },
      { role: 'bhrain/learner', via: '@ehmpathy/builder' },
      { role: 'playwright', via: null },
    ];
    const linked = [
      'ehmpathy/mechanic',
      'bhrowser/playwright',
      'ghlitch/observer',
    ];

    when('[t0] the drift is computed', () => {
      const drift = getActorsDrift({ declared, linked, linkedNative: [] });

      then('a declared role not linked is short, with its source', () => {
        expect(drift.short).toEqual([
          { role: 'bhrain/learner', via: '@ehmpathy/builder' },
        ]);
      });
      then('a bare declared slug matches its qualified link', () => {
        expect(drift.short.map((one) => one.role)).not.toContain('playwright');
      });
      then('a linked role not declared is extra', () => {
        expect(drift.extra).toEqual(['ghlitch/observer']);
      });
    });
  });

  given('[case2] a declared set that matches the linked set', () => {
    when('[t0] the drift is computed', () => {
      then('it is empty both ways', () => {
        const drift = getActorsDrift({
          declared: [{ role: 'ehmpathy/mechanic', via: null }],
          linked: ['ehmpathy/mechanic'],
          linkedNative: [],
        });
        expect(drift).toEqual({ short: [], extra: [], nativeUndeclared: [] });
      });
    });
  });

  given('[case3] native `.this` roles, one declared and one not', () => {
    when('[t0] the drift is computed', () => {
      const drift = getActorsDrift({
        declared: [
          { role: 'ehmpathy/mechanic', via: null },
          { role: '.this/tuner', via: null },
        ],
        linked: ['ehmpathy/mechanic'],
        linkedNative: ['.this/any', '.this/tuner'],
      });

      then(
        'the undeclared native role is named, and the declared one is not',
        () => {
          expect(drift.nativeUndeclared).toEqual(['.this/any']);
        },
      );
      then('a declared native role is present, never short', () => {
        expect(drift.short).toEqual([]);
      });
      then('a native role is never extra', () => {
        expect(drift.extra).toEqual([]);
      });
    });
  });
});

describe('asActorsDriftReportLines', () => {
  given('[case1] drift both ways, with a caution', () => {
    when('[t0] the report is rendered', () => {
      const lines = asActorsDriftReportLines({
        ambient: '@builder',
        countActors: 2,
        countRoles: 6,
        drift: {
          short: [{ role: 'bhrain/learner', via: '@ehmpathy/builder' }],
          extra: ['ghlitch/observer'],
          nativeUndeclared: [],
        },
        warnings: [
          '@builder removes -driver, which @ehmpathy/builder does not hold',
        ],
        actorsUndeclared: [],
      });

      then('it names the repo actor, each drift row and both fixes', () => {
        const text = lines.join('\n');
        expect(text).toContain('repo actor = @builder');
        expect(text).toContain(
          'bhrain/learner ↺ linked, via @ehmpathy/builder',
        );
        expect(text).toContain('extra → kept, undeclared');
        expect(text).toContain(
          'to drop it, unlink .agent/repo=ghlitch/role=observer',
        );
      });
      then('it matches the snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case2] no drift', () => {
    when('[t0] the report is rendered', () => {
      const lines = asActorsDriftReportLines({
        ambient: '@scholar',
        countActors: 1,
        countRoles: 3,
        drift: { short: [], extra: [], nativeUndeclared: [] },
        warnings: [],
        actorsUndeclared: [],
      });

      then('it says the set is in sync', () => {
        expect(lines.join('\n')).toContain('in sync, no role short');
      });
      then('it matches the snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case3] a native `.this` role no actor declares', () => {
    when('[t0] the report is rendered', () => {
      const lines = asActorsDriftReportLines({
        ambient: '@builder',
        countActors: 1,
        countRoles: 1,
        drift: { short: [], extra: [], nativeUndeclared: ['.this/any'] },
        warnings: [],
        actorsUndeclared: [],
      });

      then('it names the role and the fix, under the ambient actor', () => {
        const text = lines.join('\n');
        expect(text).toContain('native → not booted, undeclared');
        expect(text).toContain(
          'to boot it, declare `.this/any` under @builder in .agent/actors.yml',
        );
      });
      then('it matches the snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case4] actor dirs whose base slug left actors.yml (F15)', () => {
    when('[t0] the report is rendered', () => {
      const lines = asActorsDriftReportLines({
        ambient: '@builder',
        countActors: 1,
        countRoles: 2,
        drift: { short: [], extra: [], nativeUndeclared: [] },
        warnings: [],
        actorsUndeclared: ['slug=scholar', 'slug=scholar._.delta=f00d'],
      });

      then('it names each kept dir and both fixes', () => {
        const text = lines.join('\n');
        expect(text).toContain('actor dirs → kept, slug undeclared');
        expect(text).toContain('actor.via.slug=scholar._.delta=f00d');
        expect(text).toContain(
          'to keep it, re-declare `@scholar` in .agent/actors.yml',
        );
        expect(text).toContain('to reap its dead clones, rhx clone prune');
      });
      then('it matches the snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
