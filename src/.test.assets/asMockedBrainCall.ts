/**
 * .what = one call a mocked brain received, as a test reads it back
 */
export interface MockedBrainCall {
  verb: 'ask' | 'act';
  prompt: string;
  briefs: string[];
}

/**
 * .what = casts what a mocked brain was handed into the record a test reads back
 * .why = one shape for the repl and the atom mocks, so a suite asserts on either the same way
 * .note = a prompt can be a string or BrainPlugToolExecution[] (a tool result continuation);
 *   the latter is recorded as its json
 */
export const asMockedBrainCall = (input: {
  verb: 'ask' | 'act';
  prompt: unknown;
  briefs: Array<{ ref: { uri: string } }> | undefined; // the slice of a brief artifact it reads
}): MockedBrainCall => ({
  verb: input.verb,
  prompt:
    typeof input.prompt === 'string'
      ? input.prompt
      : JSON.stringify(input.prompt),
  briefs: (input.briefs ?? []).map((brief) => brief.ref.uri),
});
