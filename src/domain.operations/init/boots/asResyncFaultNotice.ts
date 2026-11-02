/**
 * .what = the stderr notice for a boot + hook resync that faulted after a part-way fault
 * .why = the resync fault is printed, never thrown, so the notice must carry its class and stack;
 *   a maintainer who meets a broken recovery path needs the same diagnosis a thrown error gives
 */
export const asResyncFaultNotice = (input: { error: unknown }): string => {
  const detail =
    input.error instanceof Error
      ? (input.error.stack ?? `${input.error.name}: ${input.error.message}`)
      : String(input.error);
  return [
    '💥 MalfunctionError: the boot + hook resync after the part-way fault faulted too',
    ...detail.split('\n').map((line) => `   │ ${line}`),
  ].join('\n');
};
