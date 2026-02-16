/**
 * .what = returns the temp directory path
 * .why = centralizes temp dir resolution with XDG fallback chain
 */
export const getTempDir = (): string => {
  // prefer XDG_RUNTIME_DIR (per-user runtime dir, often tmpfs)
  const xdgRuntime = process.env['XDG_RUNTIME_DIR'];
  if (xdgRuntime) return xdgRuntime;

  // fallback to TMPDIR (standard unix)
  const tmpdir = process.env['TMPDIR'];
  if (tmpdir) return tmpdir;

  // fallback to /tmp
  return '/tmp';
};
