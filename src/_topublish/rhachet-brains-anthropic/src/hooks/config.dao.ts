import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * .what = claude code settings shape for hooks section
 * .why = typed representation of .claude/settings.json hooks structure
 */
export interface ClaudeCodeHookEntry {
  matcher: string;
  hooks: Array<{
    type: string;
    command: string;
    timeout?: number;
  }>;
}

export interface ClaudeCodeSettings {
  hooks?: {
    SessionStart?: ClaudeCodeHookEntry[];
    PreToolUse?: ClaudeCodeHookEntry[];
    PostToolUse?: ClaudeCodeHookEntry[];
    Stop?: ClaudeCodeHookEntry[];
  };
  [key: string]: unknown;
}

/**
 * .what = reads claude code settings from .claude/settings.json
 * .why = enables hook discovery and modification
 */
export const readClaudeCodeSettings = async (input: {
  from: string;
}): Promise<ClaudeCodeSettings> => {
  const settingsPath = path.join(input.from, '.claude', 'settings.json');

  // check if file exists
  try {
    await fs.access(settingsPath);
  } catch {
    return {};
  }

  // read and parse
  const content = await fs.readFile(settingsPath, 'utf-8');
  return JSON.parse(content) as ClaudeCodeSettings;
};

/**
 * .what = writes claude code settings to .claude/settings.json
 * .why = enables hook sync to persist changes
 */
export const writeClaudeCodeSettings = async (input: {
  settings: ClaudeCodeSettings;
  to: string;
}): Promise<void> => {
  const settingsDir = path.join(input.to, '.claude');
  const settingsPath = path.join(settingsDir, 'settings.json');

  // ensure directory exists
  await fs.mkdir(settingsDir, { recursive: true });

  // write settings with indented json
  const content = JSON.stringify(input.settings, null, 2);
  await fs.writeFile(settingsPath, content + '\n', 'utf-8');
};
