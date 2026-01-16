import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * .what = opencode plugin file metadata for rhachet-managed hooks
 * .why = enables identification and management of rhachet-generated plugins
 */
export interface OpencodePluginMeta {
  author: string;
  event: string;
  command: string;
  timeout?: number;
  filter?: { what: string };
}

/**
 * .what = generates plugin filename from hook metadata
 * .why = consistent names enable lookup and management
 */
export const getPluginFileName = (meta: {
  author: string;
  event: string;
  command: string;
}): string => {
  // create safe filename from command (hash-like suffix)
  const commandHash = Buffer.from(meta.command)
    .toString('base64url')
    .slice(0, 12);
  const authorSafe = meta.author.replace(/[^a-zA-Z0-9-_]/g, '-');
  return `rhachet-${authorSafe}-${meta.event}-${commandHash}.ts`;
};

/**
 * .what = parses plugin filename to extract metadata
 * .why = enables identification of rhachet-managed plugins
 */
export const parsePluginFileName = (
  filename: string,
): { author: string; event: string } | null => {
  const match = filename.match(
    /^rhachet-(.+)-(onBoot|onTool|onStop)-[a-zA-Z0-9_-]+\.ts$/,
  );
  if (!match) return null;
  return {
    author: match[1]!,
    event: match[2]!,
  };
};

/**
 * .what = generates opencode plugin file content
 * .why = creates TypeScript plugin that calls the hook command
 */
export const generatePluginContent = (meta: OpencodePluginMeta): string => {
  const timeoutMs = meta.timeout ?? 30000;

  // map rhachet event to opencode hook implementation
  const hookImpl = getHookImplementation(meta);

  return `/**
 * rhachet-managed opencode plugin
 * author: ${meta.author}
 * event: ${meta.event}
 * command: ${meta.command}
 *
 * DO NOT EDIT - this file is managed by rhachet
 */

import type { Plugin } from "@opencode-ai/plugin";
import { execSync } from "node:child_process";

export const RhachetHook: Plugin = async () => {
  return {
${hookImpl}
  };
};

export default RhachetHook;
`;
};

/**
 * .what = generates hook implementation based on event type
 * .why = each event type maps to different opencode hook structure
 */
const getHookImplementation = (meta: OpencodePluginMeta): string => {
  const { event, command, filter, timeout } = meta;
  const timeoutMs = timeout ?? 30000;

  if (event === 'onBoot') {
    return `    session: {
      created: async () => {
        execSync(${JSON.stringify(command)}, { stdio: "inherit", timeout: ${timeoutMs} });
      },
    },`;
  }

  if (event === 'onTool') {
    const filterCheck =
      filter?.what && filter.what !== '*'
        ? `\n        if (input.tool !== ${JSON.stringify(filter.what)}) return;`
        : '';
    return `    tool: {
      execute: {
        before: async (input) => {${filterCheck}
          execSync(${JSON.stringify(command)}, { stdio: "inherit", timeout: ${timeoutMs} });
        },
      },
    },`;
  }

  if (event === 'onStop') {
    return `    session: {
      idle: async () => {
        execSync(${JSON.stringify(command)}, { stdio: "inherit", timeout: ${timeoutMs} });
      },
    },`;
  }

  // fallback - should not reach here
  return `    // unknown event: ${event}`;
};

/**
 * .what = parses plugin file content to extract metadata
 * .why = enables read of hook configuration from found plugins
 */
export const parsePluginContent = (
  content: string,
): OpencodePluginMeta | null => {
  // extract metadata from header comment
  const authorMatch = content.match(/\* author: (.+)$/m);
  const eventMatch = content.match(/\* event: (.+)$/m);
  const commandMatch = content.match(/\* command: (.+)$/m);

  if (!authorMatch || !eventMatch || !commandMatch) return null;

  return {
    author: authorMatch[1]!.trim(),
    event: eventMatch[1]!.trim(),
    command: commandMatch[1]!.trim(),
  };
};

/**
 * .what = reads all rhachet-managed plugins from .opencode/plugin/
 * .why = enables enumeration of found hooks
 */
export const readOpencodePlugins = async (input: {
  from: string;
}): Promise<Array<{ filename: string; meta: OpencodePluginMeta }>> => {
  const pluginDir = path.join(input.from, '.opencode', 'plugin');

  // check if directory exists
  try {
    await fs.access(pluginDir);
  } catch {
    return [];
  }

  // list all rhachet plugin files
  const files = await fs.readdir(pluginDir);
  const rhachetFiles = files.filter(
    (f) => f.startsWith('rhachet-') && f.endsWith('.ts'),
  );

  // read and parse each file
  const plugins: Array<{ filename: string; meta: OpencodePluginMeta }> = [];
  for (const filename of rhachetFiles) {
    const filePath = path.join(pluginDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const meta = parsePluginContent(content);
    if (meta) {
      plugins.push({ filename, meta });
    }
  }

  return plugins;
};

/**
 * .what = writes a plugin file to .opencode/plugin/
 * .why = enables hook sync to persist plugins
 */
export const writeOpencodePlugin = async (input: {
  meta: OpencodePluginMeta;
  to: string;
}): Promise<string> => {
  const pluginDir = path.join(input.to, '.opencode', 'plugin');
  const filename = getPluginFileName(input.meta);
  const filePath = path.join(pluginDir, filename);

  // ensure directory exists
  await fs.mkdir(pluginDir, { recursive: true });

  // generate and write content
  const content = generatePluginContent(input.meta);
  await fs.writeFile(filePath, content, 'utf-8');

  return filename;
};

/**
 * .what = deletes a plugin file from .opencode/plugin/
 * .why = enables hook removal via sync
 */
export const deleteOpencodePlugin = async (input: {
  filename: string;
  from: string;
}): Promise<void> => {
  const filePath = path.join(input.from, '.opencode', 'plugin', input.filename);

  try {
    await fs.unlink(filePath);
  } catch {
    // file may not exist, ignore
  }
};
