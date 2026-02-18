import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * .what = writes a secret value to the os.direct store
 * .why = tests need to pre-populate the direct store before unlock
 *
 * .note = the direct store maps slug to { value } entries
 */
export const writeDirectStoreEntry = (input: {
  home: string;
  slug: string;
  value: string;
}): void => {
  const path = join(input.home, '.rhachet', 'keyrack', 'vault', 'os.direct', 'keyrack.direct.json');
  const dir = dirname(path);

  // ensure directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // read current store or create empty
  let store: Record<string, { value: string }> = {};
  if (existsSync(path)) {
    const content = readFileSync(path, 'utf8');
    store = JSON.parse(content);
  }

  // add entry
  store[input.slug] = { value: input.value };

  // write back
  writeFileSync(path, JSON.stringify(store, null, 2), 'utf8');
};
