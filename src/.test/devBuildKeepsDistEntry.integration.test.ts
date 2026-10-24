import { given, then, useBeforeAll, when } from 'test-fns';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = every npm command a dev-local run reaches from one entry, across `npm run` hops
 * .why = the hazard sits in whichever command an entry reaches transitively, never in the entry's
 *        own text, so the clamp must follow the graph
 */
const getAllCommandsReached = (input: {
  commands: Record<string, string>;
  entry: string;
}): string[] => {
  const reached = new Set<string>();
  const queue = [input.entry];
  while (queue.length) {
    const name = queue.shift()!;
    if (reached.has(name)) continue;
    reached.add(name);
    const body = input.commands[name] ?? '';
    for (const match of body.matchAll(/npm run ([\w:.-]+)/g))
      queue.push(match[1]!);
  }
  return [...reached];
};

/**
 * .what = the dev-local build never deletes dist
 * .why = this repo resolves its own `rhachet` through a `link:.` self-link, and role packages
 *        (`rhachet-roles-bhuild` among them) require that peer from hooks that fire at any moment —
 *        a stop hook at the end of every turn. a rebuild that runs `rm -rf dist/` leaves the
 *        self-link pointed at an absent `dist/index.js` for the minutes tsc takes, and each hook in
 *        that window throws MODULE_NOT_FOUND (measured 2026-10-23: a background acceptance resnap
 *        rebuilt via `build:ifstale` → `build` → `build:clean`, and the bhuild dispatcher stop hook
 *        threw). an in-place compile overwrites each file, so the entry never disappears
 * .note = the full `build` keeps its clean: ci and publish start from a clean checkout and run no
 *         hooks against this tree
 */
describe('dev build keeps the dist entry', () => {
  given('[case1] this repo package.json', () => {
    const pkg = useBeforeAll(async () => {
      const manifest = JSON.parse(
        readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'),
      ) as { scripts: Record<string, string> };
      return { commands: manifest.scripts };
    });

    when('[t0] the dev-local entries are walked', () => {
      then('neither build:ifstale nor test:acceptance:locally reaches build:clean', () => {
        const reached = [
          ...getAllCommandsReached({
            commands: pkg.commands,
            entry: 'build:ifstale',
          }),
          ...getAllCommandsReached({
            commands: pkg.commands,
            entry: 'test:acceptance:locally',
          }),
        ];
        expect(reached).not.toContain('build:clean');
        expect(reached).not.toContain('build:clean:tsc');
      });

      then('no command those entries reach deletes dist inline', () => {
        const bodies = getAllCommandsReached({
          commands: pkg.commands,
          entry: 'test:acceptance:locally',
        }).map((name) => pkg.commands[name] ?? '');
        expect(bodies.filter((body) => /rm -rf dist/.test(body))).toEqual([]);
      });

      then('the rebuild still compiles and stamps dist', () => {
        const reached = getAllCommandsReached({
          commands: pkg.commands,
          entry: 'build:ifstale',
        });
        expect(reached).toContain('build:compile');
        expect(reached).toContain('build:complete');
      });
    });
  });
});
