import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * .what = writes a test asset file to a temp directory
 * .why = standardizes test asset creation with safety guard for temp paths
 */
export const setTestTempAsset = (input: {
  /** directory to create the asset in (must be under .temp) */
  dir: string;
  /** filename (e.g., 'test.sh', 'data.json') */
  name: string;
  /** file content */
  content: string;
  /** whether to make the file executable (default: true for .sh files) */
  executable?: boolean;
}): {
  /** absolute path to the created asset */
  path: string;
} => {
  // guard: ensure we're writing to a temp directory
  if (!input.dir.includes('.temp'))
    throw new Error(
      `setTestTempAsset: dir must be under .temp for safety, got: ${input.dir}`,
    );

  const assetPath = resolve(input.dir, input.name);

  // ensure parent directory exists
  mkdirSync(dirname(assetPath), { recursive: true });

  // write asset
  writeFileSync(assetPath, input.content);

  // make executable if requested or if .sh extension
  const shouldExecute = input.executable ?? input.name.endsWith('.sh');
  if (shouldExecute) chmodSync(assetPath, '755');

  return { path: assetPath };
};
