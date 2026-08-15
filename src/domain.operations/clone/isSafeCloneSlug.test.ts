import { isSafeCloneSlug } from './isSafeCloneSlug';

const SAFE = ['driver', 'foreman', 'red-team', 'clone.1', 'a_b', 'bert2'];
const UNSAFE = [
  '', // empty
  '../evil', // parent hop
  'a/b', // path separator
  'a\\b', // windows separator
  '..', // bare parent
  'UPPER', // uppercase (out of the legible charset)
  '-lead', // must start alphanumeric
  '.dotfile', // must start alphanumeric
  'x'.repeat(65), // over the length cap
  'has space', // space
];

describe('isSafeCloneSlug', () => {
  describe('safe slugs', () => {
    SAFE.forEach((slug) =>
      test(`'${slug}' is safe`, () => {
        expect(isSafeCloneSlug({ slug })).toBe(true);
      }),
    );
  });

  describe('unsafe slugs', () => {
    UNSAFE.forEach((slug) =>
      test(`'${slug}' is unsafe`, () => {
        expect(isSafeCloneSlug({ slug })).toBe(false);
      }),
    );
  });
});
