import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

export type LinkResult = {
  path: string;
  status: 'created' | 'unchanged' | 'updated' | 'removed';
};

/**
 * .what = finds or inserts a file with template content
 * .why = ensures standard readme files exist without overwriting custom changes
 * .how = only writes if file doesn't exist or content matches template exactly
 */
export const findsertFile = (options: {
  path: string;
  template: string;
}): LinkResult => {
  const { path, template } = options;
  const relativePath = relative(process.cwd(), path);

  if (!existsSync(path)) {
    writeFileSync(path, template, 'utf8');
    return { path: relativePath, status: 'created' };
  }

  // File exists - check if it matches template
  const existingContent = readFileSync(path, 'utf8');
  if (existingContent === template) {
    return { path: relativePath, status: 'unchanged' };
  } else {
    return { path: relativePath, status: 'unchanged' }; // preserved with custom changes
  }
};
