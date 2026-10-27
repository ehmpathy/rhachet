import { asBrainDirBootFailureLines } from '@src/domain.operations/boot/asBrainDirBootFailureLines';

/**
 * .what = print one named failure per corpus not written, on stderr
 */
export const emitBrainDirBootFailureLines = (input: {
  failures: Parameters<typeof asBrainDirBootFailureLines>[0]['failure'][];
}): void => {
  for (const failure of input.failures)
    for (const line of asBrainDirBootFailureLines({ failure }))
      console.error(line);
};
