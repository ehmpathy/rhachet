import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

/**
 * .what = findsert a file or directory (find or insert)
 * .why = idempotent creation - reports [found] if exists, [created] if not
 */
export const findsertFile = (input: {
  cwd: string;
  path: string;
  content?: string;
}): { effect: 'FOUND' | 'CREATED' } => {
  // check if already exists
  if (existsSync(input.path)) {
    console.log(`  ○ [found] ${relative(input.cwd, input.path)}`);
    return { effect: 'FOUND' };
  }

  // create file or directory
  if (input.content !== undefined)
    writeFileSync(input.path, input.content, 'utf8');
  else mkdirSync(input.path, { recursive: true });
  console.log(`  + [created] ${relative(input.cwd, input.path)}`);
  return { effect: 'CREATED' };
};
