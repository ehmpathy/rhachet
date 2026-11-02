import { given, then, useBeforeAll, when } from 'test-fns';

import { genSampleRepoWithSubjects } from '@src/.test/assets/genSampleRepoWithSubjects';

import { getAllRolesAtFocusAlwaysShed } from './getAllRolesAtFocusAlwaysShed';

describe('getAllRolesAtFocusAlwaysShed', () => {
  given(
    '[case1] a linked role whose lean subject sheds always (wish 3)',
    () => {
      const scene = useBeforeAll(async () => ({
        repoPath: genSampleRepoWithSubjects({
          slug: 'getAllRolesAtFocusAlwaysShed-c1',
        }),
      }));

      when('[t0] the role is focused on lean', () => {
        then('the role is named as one that shed always', () => {
          expect(
            getAllRolesAtFocusAlwaysShed({
              refs: [{ repo: '.this', role: 'any', subjects: ['lean'] }],
              repoPath: scene.repoPath,
            }),
          ).toEqual(['any']);
        });
      });

      when('[t1] the role is focused on flow, which inherits always', () => {
        then('naught is named', () => {
          expect(
            getAllRolesAtFocusAlwaysShed({
              refs: [{ repo: '.this', role: 'any', subjects: ['flow'] }],
              repoPath: scene.repoPath,
            }),
          ).toEqual([]);
        });
      });

      when('[t2] the role is focused on lean and flow', () => {
        then('naught is named — flow still needs always', () => {
          expect(
            getAllRolesAtFocusAlwaysShed({
              refs: [
                { repo: '.this', role: 'any', subjects: ['lean', 'flow'] },
              ],
              repoPath: scene.repoPath,
            }),
          ).toEqual([]);
        });
      });

      when('[t3] the role is whole, beside a role with no spec', () => {
        then('naught is named', () => {
          expect(
            getAllRolesAtFocusAlwaysShed({
              refs: [
                { repo: '.this', role: 'any', subjects: null },
                { repo: 'fixture', role: 'zeta', subjects: null },
              ],
              repoPath: scene.repoPath,
            }),
          ).toEqual([]);
        });
      });
    },
  );
});
