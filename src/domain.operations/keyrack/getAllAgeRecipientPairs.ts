import { getOneAgeRecipientOrNull } from '@src/domain.operations/keyrack/getOneAgeRecipientOrNull';

/**
 * .what = convert each ssh manifest recipient to its age recipient, paired with the original recipient
 * .why = keeps the filter-map-drop array-shape work out of the discovery orchestrator; the pair lets a
 *        later match map a matched age recipient back to its manifest recipient
 *
 * .note = only ssh-mech recipients convert; a non-ssh recipient is skipped
 * .note = getOneAgeRecipientOrNull skips a per-key parse miss but rethrows a broken crypto load (e6),
 *         so a genuine crypto malfunction propagates loud rather than a quietly smaller recipient set
 * .note = `getOne` is an OPTIONAL injected per-key getter (dependency injection); it defaults to the
 *         real `getOneAgeRecipientOrNull`. the unit test injects a fake to exercise the
 *         filter-map-drop (and rethrow-propagation) logic WITHOUT a `jest.mock`
 *         (rule.forbid.unit.remote-boundaries).
 */
export const getAllAgeRecipientPairs = async (
  input: {
    recipients: Array<{ mech: string; pubkey: string }>;
  },
  context?: {
    getOne?: (input: { pubkey: string }) => Promise<string | null>;
  },
): Promise<
  Array<{ original: { mech: string; pubkey: string }; ageRecipient: string }>
> => {
  const getOne = context?.getOne ?? getOneAgeRecipientOrNull;
  const pairs = await Promise.all(
    input.recipients
      .filter((recipient) => recipient.mech === 'ssh')
      .map(async (recipient) => {
        const ageRecipient = await getOne({
          pubkey: recipient.pubkey,
        });
        return ageRecipient ? { original: recipient, ageRecipient } : null;
      }),
  );
  return pairs.filter(
    (pair): pair is NonNullable<typeof pair> => pair !== null,
  );
};
