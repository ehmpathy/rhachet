import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

/**
 * .what = upsert a file or directory (update or insert)
 * .why = explicit overwrite - reports [updated] if exists, [created] if not
 */
export const upsertFile = (input: {
  cwd: string;
  path: string;
  content?: string;
}): { effect: 'UPDATED' | 'CREATED' } => {
  const existed = existsSync(input.path);

  // create file or directory
  if (input.content !== undefined)
    writeFileSync(input.path, input.content, 'utf8');
  else mkdirSync(input.path, { recursive: true });

  if (existed) {
    console.log(`  ↻ [updated] ${relative(input.cwd, input.path)}`);
    return { effect: 'UPDATED' };
  }

  console.log(`  + [created] ${relative(input.cwd, input.path)}`);
  return { effect: 'CREATED' };
};
