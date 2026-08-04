import { withAssure } from 'type-fns';

import type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack/KeyrackGrantMechanism';

/**
 * .what = the aws.params supported-mech set — the one source of truth
 * .why = mechs.supported AND the get()/del() membership guards both read this array, so
 *        they cannot list different sets (a new mech is added in exactly one place)
 */
export const KEYRACK_AWS_PARAM_MECHS = [
  'PERMANENT_VIA_REPLICA',
  'EPHEMERAL_VIA_GITHUB_APP',
] as const satisfies readonly KeyrackGrantMechanism[];

/**
 * .what = assess whether a mech is one aws.params supports
 * .why = get()/del() read a stored mech (stale/hand-edited/corrupt possible) and must guard
 *        it with the same named-type-check idiom used for names + meta
 */
export const isKeyrackAwsParamMech = withAssure(
  (
    value: KeyrackGrantMechanism,
  ): value is (typeof KEYRACK_AWS_PARAM_MECHS)[number] =>
    (KEYRACK_AWS_PARAM_MECHS as readonly string[]).includes(value),
  { name: 'isKeyrackAwsParamMech' },
);
