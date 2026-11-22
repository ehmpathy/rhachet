import { given, then, when } from 'test-fns';

import { asBootSayResourcesDefanged } from './asBootSayResourcesDefanged';
import type { BootSayResource } from './getAllBootSayResources';
import {
  BOOT_CACHE_BOUNDARY_DEFANGED,
  BOOT_CACHE_BOUNDARY_LINE,
} from './getOneBootCacheBoundary';

const REF = { repo: '.this', role: 'any' };
const CWD = '/repo';

const asSaid = (input: { name: string; content: string }): BootSayResource => ({
  tag: 'brief.say',
  pathToLabel: `${CWD}/.agent/repo=.this/role=any/briefs/${input.name}`,
  content: input.content,
});

describe('asBootSayResourcesDefanged', () => {
  given('[case1] said files that hold no boundary literal', () => {
    when('[t0] defanged', () => {
      const said = [asSaid({ name: 'a.md', content: 'plain brief' })];
      const result = asBootSayResourcesDefanged({ said, ref: REF, cwd: CWD });

      then('every file passes unchanged, and no defect is named', () => {
        expect(result.said).toEqual(said);
        expect(result.defects).toEqual([]);
      });
    });
  });

  given(
    '[case2] one file that holds the literal twice, beside a clean one',
    () => {
      when('[t0] defanged', () => {
        const result = asBootSayResourcesDefanged({
          said: [
            asSaid({ name: 'clean.md', content: 'plain brief' }),
            asSaid({
              name: 'core.md',
              content: `one ${BOOT_CACHE_BOUNDARY_LINE} two ${BOOT_CACHE_BOUNDARY_LINE}`,
            }),
          ],
          ref: REF,
          cwd: CWD,
        });

        then('every copy in the holder is replaced', () => {
          expect(result.said[1]!.content).not.toContain(
            BOOT_CACHE_BOUNDARY_LINE,
          );
          expect(
            result.said[1]!.content.split(BOOT_CACHE_BOUNDARY_DEFANGED).length -
              1,
          ).toEqual(2);
        });

        then('the clean file passes unchanged', () => {
          expect(result.said[0]!.content).toEqual('plain brief');
        });

        then('the holder is named once, by its repo-relative path', () => {
          expect(result.defects).toEqual([
            {
              kind: 'boundary-literal',
              ref: REF,
              pathToFile: '.agent/repo=.this/role=any/briefs/core.md',
              detail: null,
            },
          ]);
        });
      });
    },
  );
});
