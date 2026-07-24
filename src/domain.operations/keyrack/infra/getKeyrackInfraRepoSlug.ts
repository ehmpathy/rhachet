/**
 * .what = derive the keyrack-infra repo slug for an org
 * .why = the infra repo name is a fixed convention, not configurable
 *
 * .note = one repo per org: `$org/keyrack-infra`
 */
export const getKeyrackInfraRepoSlug = (input: { org: string }): string =>
  `${input.org}/keyrack-infra`;
