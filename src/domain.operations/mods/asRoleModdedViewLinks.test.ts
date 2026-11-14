import { given, then, when } from 'test-fns';

import { genSampleRoleModPlan } from '@src/.test/assets/genSampleRoleModPlan';

import { asRoleModdedViewLinks } from './asRoleModdedViewLinks';

const STORE = '/store/rhachet-roles-ehmpathy/dist/roles/mechanic';
const MOD_DIR = '/repo/.agent/repo=.mods/role=mechanic';

const FILES_PUBLISHED = new Map([
  [
    'briefs/rule.require.surf-wax.md',
    `${STORE}/briefs/rule.require.surf-wax.md`,
  ],
  [
    'briefs/rule.require.surf-wax.md.min',
    `${STORE}/briefs/rule.require.surf-wax.md.min`,
  ],
  ['briefs/rule.forbid.wipeouts.md', `${STORE}/briefs/rule.forbid.wipeouts.md`],
  ['briefs/howto.paddle-out.md', `${STORE}/briefs/howto.paddle-out.md`],
  ['skills/wax.board.sh', `${STORE}/skills/wax.board.sh`],
]);

describe('asRoleModdedViewLinks', () => {
  given(
    '[case1] a plan that shadows, adds, nots, and drops a minification',
    () => {
      when('[t0] the links are computed', () => {
        const links = asRoleModdedViewLinks({
          filesPublished: FILES_PUBLISHED,
          modDir: MOD_DIR,
          plan: genSampleRoleModPlan({
            nots: ['briefs/rule.forbid.wipeouts.md'],
            minsDropped: ['briefs/rule.require.surf-wax.md.min'],
          }),
        });

        then('a shadow points into the mod dir', () => {
          expect(links.get('briefs/rule.require.surf-wax.md')).toEqual(
            `${MOD_DIR}/briefs/rule.require.surf-wax.md`,
          );
        });

        then('an add points into the mod dir', () => {
          expect(links.get('briefs/rule.require.reef-etiquette.md')).toEqual(
            `${MOD_DIR}/briefs/rule.require.reef-etiquette.md`,
          );
        });

        then('a not and a dropped minification have no link', () => {
          expect(links.has('briefs/rule.forbid.wipeouts.md')).toEqual(false);
          expect(links.has('briefs/rule.require.surf-wax.md.min')).toEqual(
            false,
          );
        });

        then('a file the mod leaves alone still points at the store', () => {
          expect(links.get('skills/wax.board.sh')).toEqual(
            `${STORE}/skills/wax.board.sh`,
          );
        });

        then('the links are sorted by path, so a render is stable', () => {
          expect([...links.keys()]).toEqual([
            'briefs/howto.paddle-out.md',
            'briefs/rule.require.reef-etiquette.md',
            'briefs/rule.require.surf-wax.md',
            'skills/wax.board.sh',
          ]);
        });
      });
    },
  );
});
