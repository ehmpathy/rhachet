import { RoleModPlan } from '@src/domain.objects/RoleModPlan';

/**
 * .what = a sample mod plan: one shadow, one add, one not, no minification dropped
 * .why = the plan is the one shape every mod readout reads; one fixture keeps the readout
 *        tests in step as the shape evolves
 */
export const genSampleRoleModPlan = (
  overrides: Partial<{
    shadows: string[];
    adds: string[];
    nots: string[];
    minsDropped: string[];
  }> = {},
): RoleModPlan =>
  new RoleModPlan({
    shadows: ['briefs/rule.require.surf-wax.md'],
    adds: ['briefs/rule.require.reef-etiquette.md'],
    nots: ['skills/wax.board.sh'],
    minsDropped: [],
    ...overrides,
  });
