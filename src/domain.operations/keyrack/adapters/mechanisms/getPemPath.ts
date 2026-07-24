import { homedir } from 'node:os';

/**
 * .what = prompt the human for the pem path and expand a ~ prefix
 * .why = the guided setup asks for the .pem location; this isolates the readline
 *        prompt + ~ expansion behind a named communicator
 *
 * .note = node does not expand ~ automatically, so we expand a ~ prefix to homedir
 * .note = the readline prompt is injected as `question` so the prompt is testable
 * .note = this prompts for the path only; the caller prints the `pem read ✓`
 *         closer AFTER the pem content is read, so the confirmation never precedes a
 *         failed read (a path that cannot be read must not report success first)
 */
export const getPemPath = async (input: {
  question: (prompt: string) => Promise<string>;
}): Promise<string> => {
  console.log('   │');
  console.log('   ├─ which github app secret?');
  // the prompt is a mid-branch so the caller's confirmation leaf closes the sub-tree; in
  // a real terminal readline echoes the typed path inline after the prompt
  const pemPath = await input.question('   │  ├─ private key path (.pem): ');

  // expand a ~ prefix to the home directory
  return pemPath.trim().replace(/^~(?=$|\/|\\)/, homedir());
};
