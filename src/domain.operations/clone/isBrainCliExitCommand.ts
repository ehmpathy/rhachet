/**
 * .what = is a dispatched message the brain-cli's own exit command — `/exit` or `/quit`
 * .why = a say that asks the clone to END is answered by the clone's absence: its socket
 *   closes, so no probe reads it again. without this test the say observe loop reads that close
 *   as a probe fault and lands `unreadable` on a clone that did exactly what it was told. with
 *   it, the verdict names the asked exit (`exited`) and the caller reads success
 *
 * .note = trimmed, unlike `isBrainCliClientCommand`: a stray space or newline around `/exit`
 *   changes naught about what was asked, and the cost of a miss is small either way — a missed
 *   exit reads `unreadable` (the prior behavior), never a false success on a live clone, since
 *   the verdict ALSO requires the socket to be gone
 */
export const isBrainCliExitCommand = (input: { message: string }): boolean => {
  const command = input.message.trim();
  return command === '/exit' || command === '/quit';
};
