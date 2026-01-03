import { invoke } from '@src/contract/cli/invoke';

/**
 * .what = invokable entrypoint for tests
 * .why = allows tsx to run rhachet CLI without needing compiled dist/
 */
invoke({ args: process.argv.slice(2) });
