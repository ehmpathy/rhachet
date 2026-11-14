import { genTempDir } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

/**
 * .what = write one file, its parent dirs first
 */
export const putSampleFile = (input: { path: string; content: string }): void => {
  mkdirSync(dirname(input.path), { recursive: true });
  writeFileSync(input.path, input.content);
};

/**
 * .what = a temp repo with one linked package role, `ehmpathy/mechanic` at 1.40.0, as
 *         `roles link` leaves it
 * .why = the mods integration suites each need a linked role to mod; one fixture keeps
 *        them on one published shape
 *
 * .note = the role's briefs/ and skills/ are dir links into a store under node_modules.
 *   the store holds briefs surf-wax, wipeouts and paddle-out, and skills wax.board.sh and
 *   its sourced peer wax.lib.sh
 * .note = `withMod` adds a mod pinned at 1.39.5 that shadows surf-wax, adds reef-etiquette,
 *   and nots wipeouts
 */
export const genSampleRepoWithLinkedRole = (input: {
  slug: string;
  withMod: boolean;
}): {
  repo: string;
  store: string;
  roleDir: string;
  modDir: string;
  context: ContextCli;
} => {
  const repo = realpathSync(genTempDir({ slug: input.slug }));
  const pkg = join(repo, 'node_modules', 'rhachet-roles-ehmpathy');
  const store = join(pkg, 'dist', 'roles', 'mechanic');
  putSampleFile({
    path: join(pkg, 'package.json'),
    content: '{"version":"1.40.0"}\n',
  });
  putSampleFile({
    path: join(store, 'briefs', 'rule.require.surf-wax.md'),
    content: 'wax on',
  });
  putSampleFile({
    path: join(store, 'briefs', 'rule.forbid.wipeouts.md'),
    content: 'no wipeouts',
  });
  putSampleFile({
    path: join(store, 'briefs', 'howto.paddle-out.md'),
    content: 'paddle out',
  });
  putSampleFile({
    path: join(store, 'skills', 'wax.board.sh'),
    content: 'source "$(dirname "${BASH_SOURCE[0]}")/wax.lib.sh"\nwax_word\n',
  });
  putSampleFile({
    path: join(store, 'skills', 'wax.lib.sh'),
    content: 'wax_word() { echo waxed; }\n',
  });

  // the role dir, as `roles link` makes it: one dir link per kind
  const roleDir = join(repo, '.agent', 'repo=ehmpathy', 'role=mechanic');
  mkdirSync(roleDir, { recursive: true });
  for (const kind of ['briefs', 'skills'])
    symlinkSync(
      relative(roleDir, join(store, kind)),
      join(roleDir, kind),
      'dir',
    );

  // the mod over it
  const modDir = join(repo, '.agent', 'repo=.mods', 'role=mechanic');
  if (input.withMod) {
    putSampleFile({
      path: join(modDir, 'boot.yml'),
      content: [
        'of: ehmpathy/mechanic@1.39.5',
        'briefs:',
        '  say:',
        '    - briefs/rule.require.reef-etiquette.md',
        '  not:',
        '    - briefs/rule.forbid.wipeouts.md',
        '',
      ].join('\n'),
    });
    putSampleFile({
      path: join(modDir, 'briefs', 'rule.require.surf-wax.md'),
      content: 'wax on, modded',
    });
    putSampleFile({
      path: join(modDir, 'briefs', 'rule.require.reef-etiquette.md'),
      content: 'mind the reef',
    });
  }

  return {
    repo,
    store,
    roleDir,
    modDir,
    context: new ContextCli({ cwd: repo, gitroot: repo }),
  };
};
