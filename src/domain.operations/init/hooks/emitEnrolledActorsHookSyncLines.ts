import { asEnrolledActorsHookSyncLines } from './asEnrolledActorsHookSyncLines';

/**
 * .what = print the `🧢 apply hooks to enrolled actors...` block, closed by its blank line
 * .note = no actors prints no line, not even a blank
 */
export const emitEnrolledActorsHookSyncLines = (
  input: Parameters<typeof asEnrolledActorsHookSyncLines>[0],
): void => {
  if (input.actors.length === 0) return;
  for (const line of asEnrolledActorsHookSyncLines(input)) console.log(line);
  console.log('');
};
