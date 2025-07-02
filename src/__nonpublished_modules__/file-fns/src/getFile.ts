import { promises as fs } from 'fs';
import { resolve } from 'path';

/**
 * .what = loads a file as a string from disk
 */
export const getFile = async (input: { path: string }): Promise<string> => {
  const fullPath = resolve(input.path);
  return await fs.readFile(fullPath, 'utf-8');
};
