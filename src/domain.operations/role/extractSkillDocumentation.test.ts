import { extractSkillDocumentationFromContent } from './extractSkillDocumentation';

describe('extractSkillDocumentationFromContent', () => {
  it('should extract shebang line', () => {
    const content = `#!/bin/bash
echo "hello"`;
    const result = extractSkillDocumentationFromContent(content);
    expect(result).toContain('#!/bin/bash');
    expect(result).not.toContain('echo "hello"');
  });

  it('should extract shell comments (#)', () => {
    const content = `#!/bin/bash
# This is a shell comment
# Another comment
echo "hello"`;
    const result = extractSkillDocumentationFromContent(content);
    expect(result).toContain('# This is a shell comment');
    expect(result).toContain('# Another comment');
    expect(result).not.toContain('echo "hello"');
  });

  it('should extract JS/TS comments (//)', () => {
    const content = `// This is a JS comment
// Another comment
const x = 1;`;
    const result = extractSkillDocumentationFromContent(content);
    expect(result).toContain('// This is a JS comment');
    expect(result).toContain('// Another comment');
    expect(result).not.toContain('const x = 1');
  });

  it('should extract lines starting with asterisk (*)', () => {
    // note: this captures lines starting with * (like JSDoc content lines)
    // but only when preceded by other comment lines, not standalone /** blocks
    const content = `# Header comment
 * This is an asterisk line
 * Another asterisk line
code here`;
    const result = extractSkillDocumentationFromContent(content);
    expect(result).toContain('# Header comment');
    expect(result).toContain('* This is an asterisk line');
    expect(result).toContain('* Another asterisk line');
    expect(result).not.toContain('code here');
  });

  it('should stop at first non-comment, non-blank line', () => {
    const content = `# Comment 1

# Comment 2
actual code here
# This comment should not be included`;
    const result = extractSkillDocumentationFromContent(content);
    expect(result).toContain('# Comment 1');
    expect(result).toContain('# Comment 2');
    expect(result).not.toContain('actual code here');
    expect(result).not.toContain('# This comment should not be included');
  });

  it('should handle files with no documentation', () => {
    const content = `echo "no docs here"
# comment after code`;
    const result = extractSkillDocumentationFromContent(content);
    expect(result).toContain('# [no documentation found]');
    expect(result).toContain(
      '# [implementation hidden - use skill to execute]',
    );
  });

  it('should append implementation hidden marker', () => {
    const content = `#!/bin/bash
# A documented skill
echo "hello"`;
    const result = extractSkillDocumentationFromContent(content);
    expect(result).toContain(
      '# [implementation hidden - use skill to execute]',
    );
  });

  it('should preserve blank lines between comments', () => {
    const content = `# First section

# Second section
code here`;
    const result = extractSkillDocumentationFromContent(content);
    expect(result).toContain('# First section');
    expect(result).toContain('# Second section');

    // check blank line is preserved
    const lines = result.split('\n');
    const firstIdx = lines.findIndex((l) => l.includes('First section'));
    const secondIdx = lines.findIndex((l) => l.includes('Second section'));
    expect(secondIdx - firstIdx).toBe(2); // blank line between
  });
});
