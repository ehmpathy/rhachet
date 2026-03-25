import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * .what = checks if 1password cli is installed
 * .why = fail fast before 1password operations
 *
 * .note = uses `which op` to check if op binary is in PATH
 */
export const isOpCliInstalled = async (): Promise<boolean> => {
  try {
    await execAsync('which op');
    return true;
  } catch {
    return false;
  }
};
