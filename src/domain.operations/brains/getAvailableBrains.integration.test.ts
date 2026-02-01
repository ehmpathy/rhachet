import { given, then, useBeforeAll, when } from 'test-fns';

import { type ContextCli, genContextCli } from '@src/domain.objects/ContextCli';

import { getAvailableBrains } from './getAvailableBrains';

describe('getAvailableBrains', () => {
  given('[case1] repo with rhachet-brains-anthropic installed', () => {
    // this repo has rhachet-brains-anthropic as a dependency
    const contextCli: ContextCli = useBeforeAll(async () =>
      genContextCli({ cwd: process.cwd() }),
    );

    when('[t0] getAvailableBrains() is called', () => {
      const brainsFound = useBeforeAll(async () =>
        getAvailableBrains({}, contextCli),
      );

      then('returns atoms from anthropic package', () => {
        expect(brainsFound.atoms.length).toBeGreaterThan(0);
        const anthropicAtoms = brainsFound.atoms.filter(
          (a) => a.repo === 'anthropic',
        );
        expect(anthropicAtoms.length).toBeGreaterThan(0);
      });

      then('returns repls from anthropic package', () => {
        const anthropicRepls = brainsFound.repls.filter(
          (r) => r.repo === 'anthropic',
        );
        expect(anthropicRepls.length).toBeGreaterThan(0);
      });

      then('each brain has repo, slug, description, spec', () => {
        for (const atom of brainsFound.atoms) {
          expect(atom.repo).toBeDefined();
          expect(atom.slug).toBeDefined();
          expect(atom.description).toBeDefined();
          expect(atom.spec).toBeDefined();
        }
        for (const repl of brainsFound.repls) {
          expect(repl.repo).toBeDefined();
          expect(repl.slug).toBeDefined();
          expect(repl.description).toBeDefined();
          expect(repl.spec).toBeDefined();
        }
      });
    });
  });

  given('[case2] getAvailableBrains called with no context', () => {
    when('[t0] getAvailableBrains() is called without context', () => {
      const brainsFound = useBeforeAll(async () => getAvailableBrains());

      then('defaults to process.cwd() and discovers brains', () => {
        // should still find anthropic brains since this repo has it installed
        expect(brainsFound.atoms.length).toBeGreaterThan(0);
      });
    });
  });

  given('[case3] brains are deduplicated by full slug', () => {
    const contextCli: ContextCli = useBeforeAll(async () =>
      genContextCli({ cwd: process.cwd() }),
    );

    when('[t0] getAvailableBrains() is called', () => {
      const brainsFound = useBeforeAll(async () =>
        getAvailableBrains({}, contextCli),
      );

      then('no duplicate slugs appear in atoms', () => {
        const slugsSeen = new Set<string>();
        for (const atom of brainsFound.atoms) {
          const fullSlug = atom.slug.startsWith(`${atom.repo}/`)
            ? atom.slug
            : `${atom.repo}/${atom.slug}`;
          expect(slugsSeen.has(fullSlug)).toBe(false);
          slugsSeen.add(fullSlug);
        }
      });

      then('no duplicate slugs appear in repls', () => {
        const slugsSeen = new Set<string>();
        for (const repl of brainsFound.repls) {
          const fullSlug = repl.slug.startsWith(`${repl.repo}/`)
            ? repl.slug
            : `${repl.repo}/${repl.slug}`;
          expect(slugsSeen.has(fullSlug)).toBe(false);
          slugsSeen.add(fullSlug);
        }
      });
    });
  });

  given('[case4] custom cwd via ContextCli', () => {
    const contextCli: ContextCli = useBeforeAll(async () =>
      genContextCli({ cwd: process.cwd() }),
    );

    when('[t0] getAvailableBrains(contextCli) is called', () => {
      then('discovers brains from package.json at contextCli.cwd', async () => {
        const brainsFound = await getAvailableBrains({}, contextCli);
        expect(brainsFound.atoms.length).toBeGreaterThan(0);
      });
    });
  });

  given('[case5] brains have callable ask/act methods', () => {
    const contextCli: ContextCli = useBeforeAll(async () =>
      genContextCli({ cwd: process.cwd() }),
    );

    when('[t0] getAvailableBrains() is called', () => {
      const brainsFound = useBeforeAll(async () =>
        getAvailableBrains({}, contextCli),
      );

      then('each atom has an ask method', () => {
        for (const atom of brainsFound.atoms) {
          expect(typeof atom.ask).toBe('function');
        }
      });

      then('each repl has ask and act methods', () => {
        for (const repl of brainsFound.repls) {
          expect(typeof repl.ask).toBe('function');
          expect(typeof repl.act).toBe('function');
        }
      });
    });
  });
});
