import { given, then, when } from 'test-fns';

import { genSampleRoleContentDefectsLinked } from '@src/.test/assets/genSampleRoleContentDefectsLinked';
import { genSampleRoleContentDefectsOwned } from '@src/.test/assets/genSampleRoleContentDefectsOwned';

import { asRoleContentDefectReceiptLines } from './asRoleContentDefectReceiptLines';

const DEFECTS_OWNED = genSampleRoleContentDefectsOwned();
const DEFECTS_LINKED = genSampleRoleContentDefectsLinked();
const ARMED = { getIsSweepArmed: () => true };
const UNARMED = { getIsSweepArmed: () => false };

describe('asRoleContentDefectReceiptLines', () => {
  given('[case1] a render that set no defect aside', () => {
    when('[t0] the receipt renders', () => {
      then('it prints naught, and never reads the arms', () => {
        // a plain fake that records its own read; no mock
        const reads: boolean[] = [];
        const getIsSweepArmed = (): boolean => {
          reads.push(true);
          return false;
        };
        expect(
          asRoleContentDefectReceiptLines(
            { defects: [], for: 'clone' },
            { getIsSweepArmed },
          ),
        ).toEqual([]);
        expect(reads).toEqual([]);
      });
    });
  });

  given('[case2] a render that set one of each kind aside', () => {
    when('[t0] the receipt renders', () => {
      const lines = asRoleContentDefectReceiptLines(
        { defects: DEFECTS_OWNED, for: 'clone' },
        ARMED,
      );

      then('it opens on a 🟡 line that counts the defects', () => {
        expect(lines[0]).toContain('🟡 boot set aside 3 role content defects');
      });

      then('each file is named, with its fix', () => {
        expect(lines.join('\n')).toContain('restore its .md source');
        expect(lines.join('\n')).toContain('name it another way');
        expect(lines.join('\n')).toContain('repair what the row below names');
      });

      then('the tail promises no repair a row does not name', () => {
        expect(lines[0]).toContain('each row names its fix');
      });

      then('the receipt matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });

      then(
        'an armed repo says the stop will hold, never that this is the one notice',
        () => {
          expect(lines.join('\n')).not.toContain('the one notice');
          expect(lines[lines.length - 1]).toEqual(
            '   └─ a stop holds this clone until each owned row is repaired',
          );
        },
      );
    });

    when('[t1] the receipt renders in a repo that arms no stop sweep', () => {
      const lines = asRoleContentDefectReceiptLines(
        { defects: DEFECTS_OWNED, for: 'clone' },
        UNARMED,
      );

      then('it says the receipt is the one notice, as the last branch', () => {
        expect(lines[lines.length - 1]).toEqual(
          '   └─ no stop sweep is armed for this clone, so this receipt is the one notice',
        );
      });

      then('the last defect yields its elbow to the note', () => {
        expect(lines.join('\n')).not.toContain(
          '└─ .agent/repo=.this/role=lint',
        );
      });

      then('the receipt matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case3] a linked role defect', () => {
    when('[t0] the receipt renders', () => {
      const lines = asRoleContentDefectReceiptLines(
        { defects: DEFECTS_LINKED, for: 'clone' },
        ARMED,
      );

      then(
        'the fix names each lever this repo holds: upgrade, mod, report to the owner',
        () => {
          const text = lines.join('\n');
          expect(text).toContain('upgrade via rhx upgrade');
          expect(text).toContain(
            'mod via a write to .agent/repo=.mods/role=mechanic/briefs/gone.md',
          );
          // a lone mod file is refused at the next birth; the lever names the whole mod
          expect(text).toContain(
            'plus a .agent/repo=.mods/role=mechanic/boot.yml with of: ehmpathy/mechanic that says the file, then rhx init --hooks',
          );
          expect(text).toContain(
            'or report orphan-min in repo=ehmpathy/role=mechanic to the owner of the rhachet-roles-ehmpathy package',
          );
          // rhachet names no supplier skill; a repo may link none
          expect(text).not.toContain('radio.task.push');
        },
      );

      then(
        'a broken linked boot.yml names no mod, since a mod cannot shadow it',
        () => {
          const linesSpec = asRoleContentDefectReceiptLines(
            {
              defects: [
                {
                  kind: 'spec-unparsed',
                  ref: { repo: 'ehmpathy', role: 'mechanic' },
                  pathToFile: '.agent/repo=ehmpathy/role=mechanic/boot.yml',
                  detail: null,
                },
              ],
              for: 'clone',
            },
            ARMED,
          );
          // each lever sits on its own row: upgrade, then report, no mod between
          const rowUpgrade = linesSpec.findIndex((line) =>
            line.includes('upgrade via rhx upgrade'),
          );
          expect(rowUpgrade).toBeGreaterThan(-1);
          expect(linesSpec[rowUpgrade + 1]).toContain(
            'or report spec-unparsed in repo=ehmpathy/role=mechanic',
          );
          expect(linesSpec.join('\n')).not.toContain('repo=.mods');
        },
      );
    });
  });

  given(
    '[case3.1] only linked defects, in a repo that arms a stop sweep',
    () => {
      when('[t0] the receipt renders', () => {
        const lines = asRoleContentDefectReceiptLines(
          { defects: DEFECTS_LINKED, for: 'clone' },
          ARMED,
        );

        then('the last branch says a stop names them and holds on none', () => {
          expect(lines[lines.length - 1]).toEqual(
            '   └─ each row is a linked role, so a stop names them and holds on none',
          );
        });

        then('the armed, linked-only receipt is locked', () => {
          expect(lines.join('\n')).toMatchSnapshot();
        });
      });

      when('[t1] an owned defect rides beside them', () => {
        const lines = asRoleContentDefectReceiptLines(
          { defects: [...DEFECTS_OWNED, ...DEFECTS_LINKED], for: 'clone' },
          ARMED,
        );

        then('the last branch says a stop holds on the owned rows', () => {
          expect(lines.join('\n')).not.toContain('holds on none');
          expect(lines[lines.length - 1]).toEqual(
            '   └─ a stop holds this clone until each owned row is repaired',
          );
        });
      });
    },
  );

  given('[case4] a receipt a human reads, at the roster', () => {
    when('[t0] the receipt renders in a repo that arms no stop sweep', () => {
      const lines = asRoleContentDefectReceiptLines(
        { defects: DEFECTS_OWNED, for: 'human' },
        UNARMED,
      );

      then('it names no clone and no birth, since a human asked', () => {
        expect(lines[0]).toEqual(
          '🟡 boot set aside 3 role content defects — each role still boots; each row names its fix',
        );
        expect(lines.join('\n')).not.toContain('clone');
      });

      then(
        'the unarmed note says no stop will hold on what the receipt names',
        () => {
          expect(lines[lines.length - 1]).toEqual(
            '   └─ no stop sweep is armed in this repo, so no stop will hold on what it names',
          );
        },
      );
    });
  });
});
