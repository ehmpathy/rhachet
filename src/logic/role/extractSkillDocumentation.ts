import { readFileSync } from 'node:fs';

/**
 * .what = extracts documentation from a skill file without showing implementation
 * .why = agents should understand what skills do, not how they do it
 * .how = reads file and extracts only comments/documentation at the top
 */
export const extractSkillDocumentation = (filepath: string): string => {
  const content = readFileSync(filepath, 'utf-8');
  return extractSkillDocumentationFromContent(content);
};

/**
 * .what = extracts documentation from skill file content string
 * .why = enables testing without file system access
 * .how = parses content and extracts shebang + leading comments
 */
export const extractSkillDocumentationFromContent = (
  content: string,
): string => {
  const lines = content.split('\n');
  const docLines: string[] = [];

  // extract shebang and leading comments/documentation
  for (const line of lines) {
    const trimmed = line.trim();

    // include shebang
    if (trimmed.startsWith('#!')) {
      docLines.push(line);
      continue;
    }

    // include comment lines (shell, python, etc)
    if (
      trimmed.startsWith('#') ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('*')
    ) {
      docLines.push(line);
      continue;
    }

    // stop at first non-comment, non-blank line
    if (trimmed !== '') {
      break;
    }

    // include blank lines between comments
    docLines.push(line);
  }

  // add note about implementation being hidden
  if (docLines.length > 0) {
    docLines.push('');
    docLines.push('# [implementation hidden - use skill to execute]');
  } else {
    docLines.push('# [no documentation found]');
    docLines.push('# [implementation hidden - use skill to execute]');
  }

  return docLines.join('\n');
};
