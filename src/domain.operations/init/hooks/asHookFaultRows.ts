import { asErrorClassText } from '@src/utils/asErrorClassText';

/**
 * .what = one `✗ <source>: <Class>: <message>` row per hook sync fault
 * .why = the class rides the row, read off the error rather than asserted over it
 */
export const asHookFaultRows = (input: {
  faults: { source: string; error: Error }[];
}): string[] =>
  input.faults.map(
    (fault) => `✗ ${fault.source}: ${asErrorClassText({ error: fault.error })}`,
  );
