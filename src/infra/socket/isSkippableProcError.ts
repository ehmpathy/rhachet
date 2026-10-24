/**
 * .what = is this a /proc read error that means "not provable here", never a malfunction?
 * .why = a process gone mid-scan (ENOENT, ESRCH) or another user's (EACCES) cannot be proven a
 *   socket holder, so a scan skips it; every other error is a real fault and propagates
 */
export const isSkippableProcError = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code === 'ENOENT' || code === 'EACCES' || code === 'ESRCH';
};
