#!/usr/bin/env npx tsx

/**
 * .what = test runner for promptVisibleInput
 * .why = enables integration tests to invoke with piped stdin
 */
import { promptVisibleInput } from '../promptVisibleInput';

const main = async (): Promise<void> => {
  const result = await promptVisibleInput({ prompt: '' });
  process.stdout.write(result);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
