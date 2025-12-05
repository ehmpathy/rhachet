import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

/**
 * .what = finds or inserts a file with template content
 * .why = ensures standard readme files exist without overwriting custom changes
 * .how = only writes if file doesn't exist or content matches template exactly
 */
export const findsertFile = (options: {
  path: string;
  template: string;
}): void => {
  const { path, template } = options;
  const relativePath = relative(process.cwd(), path);

  if (!existsSync(path)) {
    console.log(`  + ${relativePath} (created)`);
    writeFileSync(path, template, 'utf8');
    return;
  }

  // File exists - check if it matches template
  const existingContent = readFileSync(path, 'utf8');
  if (existingContent === template) {
    console.log(`  ✓ ${relativePath} (unchanged)`);
  } else {
    console.log(`  ↻ ${relativePath} (preserved with custom changes)`);
  }
};
