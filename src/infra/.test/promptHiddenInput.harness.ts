#!/usr/bin/env npx tsx

/**
 * .what = test runner for promptHiddenInput
 * .why = enables integration tests to invoke with piped stdin
 */
import { promptHiddenInput } from '../promptHiddenInput';

const main = async (): Promise<void> => {
  const result = await promptHiddenInput({ prompt: '' });
  process.stdout.write(result);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
