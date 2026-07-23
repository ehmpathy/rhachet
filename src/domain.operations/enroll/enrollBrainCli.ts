import type { BrainSlug } from '@src/domain.objects/BrainSlug';

import { spawn } from 'node:child_process';
import { getSupportedBrainCommand } from './getSupportedBrainCommand';

/**
 * .what = spawns brain CLI with --setting-sources local --settings <configPath>
 * .why = skips user/project settings, uses ONLY the specified config, auth loads from credentials file
 *
 * .note = --setting-sources local skips user (~/.claude/settings.json) and project (.claude/settings.json)
 * .note = auth credentials load independently from ~/.claude/.credentials.json (not affected by --setting-sources)
 * .note = --settings <path> loads settings from specified file only
 * .note = passthrough args come after --settings <path>
 */
export const enrollBrainCli = (input: {
  brain: BrainSlug;
  configPath: string;
  args: string[];
  cwd: string;
}): void => {
  const { brain, configPath, args, cwd } = input;

  // lookup brain CLI command (shared supported-brains transformer)
  const brainCommand = getSupportedBrainCommand({ brain });

  // build args: --setting-sources local --settings <configPath> [passthrough args]
  // "local" skips user and project settings; auth still loads from ~/.claude/.credentials.json
  const fullArgs = [
    '--setting-sources',
    'local',
    '--settings',
    configPath,
    ...args,
  ];

  // spawn brain process with inherited stdio
  // .note = shell: false preserves args with spaces (e.g., prompts)
  const child = spawn(brainCommand, fullArgs, {
    cwd,
    stdio: 'inherit',
  });

  // forward exit code
  child.on('close', (code) => {
    process.exit(code ?? 0);
  });

  // handle spawn errors
  child.on('error', (err) => {
    console.error(`failed to spawn ${brainCommand}: ${err.message}`);
    process.exit(1);
  });
};
