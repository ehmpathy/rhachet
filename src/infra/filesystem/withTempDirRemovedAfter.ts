import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * .what = run a logic within a fresh os temp dir, then remove the dir, whether the logic lands or throws
 * .why = a temp dir that holds a secret must not outlive the call that made it
 */
export const withTempDirRemovedAfter = async <T>(
  input: { prefix: string },
  logic: (input: { dir: string }) => Promise<T>,
): Promise<T> => {
  const dir = mkdtempSync(join(tmpdir(), input.prefix));
  try {
    return await logic({ dir });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
