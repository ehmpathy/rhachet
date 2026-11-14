import { genSampleRoleModPlan } from '@src/.test/assets/genSampleRoleModPlan';

import { getOneRoleModProvenance } from './getOneRoleModProvenance';

const PLAN = genSampleRoleModPlan({
  adds: ['briefs/rule.require.reef-etiquette.md', 'skills/tide.read.sh'],
  nots: ['briefs/rule.forbid.wipeouts.md'],
  minsDropped: ['briefs/rule.require.surf-wax.md.min'],
});

const TEST_CASES = [
  {
    description: 'a shadow',
    pathRel: 'briefs/rule.require.surf-wax.md',
    provenance: 'shadow',
  },
  {
    description: 'the minification of a shadow',
    pathRel: 'briefs/rule.require.surf-wax.md.min',
    provenance: 'shadow',
  },
  {
    description: 'an add',
    pathRel: 'briefs/rule.require.reef-etiquette.md',
    provenance: 'add',
  },
  {
    description: 'the minification of an add',
    pathRel: 'briefs/rule.require.reef-etiquette.md.min',
    provenance: 'add',
  },
  {
    description: 'an added skill',
    pathRel: 'skills/tide.read.sh',
    provenance: 'add',
  },
  {
    description: 'a published file the mod leaves alone',
    pathRel: 'briefs/howto.paddle-out.md',
    provenance: null,
  },
] as const;

describe('getOneRoleModProvenance', () => {
  TEST_CASES.map((thisCase) =>
    test(`${thisCase.description} reads as ${thisCase.provenance}`, () => {
      expect(
        getOneRoleModProvenance({ plan: PLAN, pathRel: thisCase.pathRel }),
      ).toEqual(thisCase.provenance);
    }),
  );
});
