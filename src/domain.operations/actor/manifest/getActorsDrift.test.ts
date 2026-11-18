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
  given('[case1] an undeclared role unlinked, with a caution', () => {
    when('[t0] the report is rendered', () => {
      const lines = asActorsDriftReportLines({
        ambient: '@builder',
        countActors: 2,
        countRoles: 6,
        unlinked: ['ghlitch/observer'],
        unlinkedDeclared: [],
        warnings: [
          '@builder removes -driver, which @ehmpathy/builder does not hold',
        ],
      });

      then('it names the repo actor and one line per change', () => {
        const text = lines.join('\n');
        expect(text).toContain('repo actor = @builder');
        expect(text).toContain('- unlinked ghlitch/observer, undeclared');
        expect(text).toContain('⚠️ @builder removes -driver');
      });
      then('it prints no fix trees', () => {
        const text = lines.join('\n');
        expect(text).not.toContain('to drop it');
        expect(text).not.toContain('to keep it');
      });
      then('it matches the snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case2] no change', () => {
    when('[t0] the report is rendered', () => {
      const lines = asActorsDriftReportLines({
        ambient: '@scholar',
        countActors: 1,
        countRoles: 3,
        unlinked: [],
        unlinkedDeclared: [],
        warnings: [],
      });

      then('it says in sync, and naught else', () => {
        const text = lines.join('\n');
        expect(text).toContain('└─ in sync');
        expect(text).not.toContain('to link');
      });
      then('it matches the snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case3] a declared role the link pass could not reach', () => {
    when('[t0] the report is rendered', () => {
      const lines = asActorsDriftReportLines({
        ambient: '@builder',
        countActors: 1,
        countRoles: 1,
        unlinked: [],
        unlinkedDeclared: [
          { role: 'bhrain/learner', via: '@ehmpathy/builder' },
        ],
        warnings: [],
      });

      then('it names the role, with its source', () => {
        expect(lines.join('\n')).toContain(
          '✋ declared, not linked bhrain/learner, via @ehmpathy/builder',
        );
      });
      then('it matches the snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
