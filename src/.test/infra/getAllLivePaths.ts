import fg from 'fast-glob';

/** the code extensions a reach can be written in */
const CODE_EXTENSIONS = '{ts,cjs,mjs,js,sh}';

/**
 * .what = every code file under `cwd` the live-brain clamp reads, sorted: one universe, built by
 *   exclusion
 * .why = a hand list of roots leaves a corner unread, and each new corner is found one review at a
 *   time; a universe that names only what it leaves out reads a new root until someone excludes it
 * .note = the exclusions are what jest itself never runs, and output no code runs from:
 *   `node_modules`, `.git`, `dist`, a `.yalc` copy, the `.log`, `.behavior` and `.dream` records,
 *   any `.temp` dir (gitignored debris a test run leaves, so the verdict cannot hang on the host),
 *   and `.agent/` bar this repo's own roles (the linked roles are other packages' symlinks, and
 *   `.agent/.cache` is the rmsafe trash). symlinks are not followed, so a
 *   linked dir (`.claude`, a temp dir link) is not read twice. a `.d.ts` holds no code
 */
export const getAllLivePaths = (input: { cwd: string }): string[] => {
  const options = { cwd: input.cwd, dot: true, followSymbolicLinks: false };
  return [
    ...new Set([
      ...fg.sync([`**/*.${CODE_EXTENSIONS}`], {
        ...options,
        ignore: [
          '**/node_modules/**',
          '.git/**',
          'dist/**',
          '**/.yalc/**',
          '.agent/**',
          '.log/**',
          '.behavior/**',
          '.dream/**',
          '**/.temp/**',
          '**/*.d.ts',
        ],
      }),
      ...fg.sync([`.agent/repo=.this/**/*.${CODE_EXTENSIONS}`], {
        ...options,
        ignore: ['**/node_modules/**', '**/*.d.ts'],
      }),
    ]),
  ].sort();
};
