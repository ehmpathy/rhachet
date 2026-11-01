#!/usr/bin/env npx tsx

/**
 * .what = test runner that asks a line prompt and a hidden prompt on a tty, in either order
 * .why = lets an integration test type both answers ahead in one write, to prove the first
 *        prompt keeps the second answer for the second prompt; `PROMPT_ORDER=hidden-line`
 *        asks the hidden prompt first, so a CR that ends the secret's chunk is proven too
 */
import { promptHiddenInput } from '../promptHiddenInput';
import { promptLineInput } from '../promptLineInput';

const main = async (): Promise<void> => {
  // the hidden prompt first, when asked: its CR may close a chunk the line prompt then reads
  if (process.env.PROMPT_ORDER === 'hidden-line') {
    const hidden = await promptHiddenInput({ prompt: 'secret: ' });
    const line = await promptLineInput({ prompt: 'choice: ' });
    process.stdout.write(`\nresult.line=[${line}]\nresult.hidden=[${hidden}]\n`);
    return;
  }

  // the line prompt first, the order `keyrack fill` asks in
  const line = await promptLineInput({ prompt: 'choice: ' });
  const hidden = await promptHiddenInput({ prompt: 'secret: ' });
  process.stdout.write(`\nresult.line=[${line}]\nresult.hidden=[${hidden}]\n`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
