import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';

/**
 * .what = the mark a modded role's `roles cost` row carries
 * .why = a human sees at a glance which roles differ from their published form, and by how
 *        much; the bhuild legend marks a changed role `[~]` (`rule.require.change-symbols-of-bhuild`)
 */
export const asRoleModCostTag = (input: { plan: RoleModPlan }): string =>
  `[~] modded · ${input.plan.shadows.length} shadow · ${input.plan.adds.length} add · ${input.plan.nots.length} not`;
