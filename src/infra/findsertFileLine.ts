import { existsSync, readFileSync } from 'node:fs';
import { setFileAtomic } from './setFileAtomic';

/**
 * .what = findsert one line in a text file — append it only where no line equals it
 * .why = gitignore and exclude edits must converge on a re-run, and must keep every
 *        other line byte for byte
 */
export const findsertFileLine = (input: {
  path: string;
  line: string;
}): { effect: 'FOUND' | 'APPENDED' | 'CREATED' } => {
  // an absent file is created with the line alone
  if (!existsSync(input.path)) {
    setFileAtomic({ path: input.path, content: `${input.line}\n` });
    return { effect: 'CREATED' };
  }

  // a line already present leaves the file untouched
  const content = readFileSync(input.path, 'utf8');
  const lines = content.split('\n');
  if (lines.includes(input.line)) return { effect: 'FOUND' };

  // append, with a newline first if the last line lacks one
  const prefix =
    content === '' || content.endsWith('\n') ? content : `${content}\n`;
  setFileAtomic({ path: input.path, content: `${prefix}${input.line}\n` });
  return { effect: 'APPENDED' };
};
