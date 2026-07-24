import { KEYRACK_INFRA_REGISTRY_PATH } from './constants';
import { getKeyrackInfraReadme } from './getKeyrackInfraReadme';
import { getKeyrackInfraRepoSlug } from './getKeyrackInfraRepoSlug';
import { genGhRepo } from './gh/genGhRepo';
import { getGhFileContent } from './gh/getGhFileContent';
import type { GhRun } from './gh/runGh';
import { setGhFileContent } from './gh/setGhFileContent';

/**
 * .what = findsert an org's keyrack-infra repo, its readme, and its registry file
 * .why = one-time per-org bootstrap so members can discover apps without admin
 *
 * .note = idempotent: re-run creates neither a duplicate repo nor an overwrite
 * .note = anyone with repo-create rights in the org may run this (per decision)
 */
export const genKeyrackInfra = (
  input: { org: string },
  context: { ghRun: GhRun },
): {
  repo: string;
  repoEffect: 'created' | 'found';
  readmeEffect: 'created' | 'found';
  registryEffect: 'created' | 'found';
} => {
  const repo = getKeyrackInfraRepoSlug({ org: input.org });

  // findsert the private repo
  const repoEffect = genGhRepo({ slug: repo }, context).effect;

  // findsert one scaffold file: create only when absent. a concurrent caller that
  // scaffolds the same file first makes our create a conflict — the file now exists,
  // so we report 'found' (never overwrite a peer's scaffold) rather than fail loud
  const scaffold = (spec: {
    path: string;
    content: string;
    message: string;
  }): 'created' | 'found' => {
    const before = getGhFileContent({ repo, path: spec.path }, context);
    if (before) return 'found';

    const result = setGhFileContent(
      {
        repo,
        path: spec.path,
        content: spec.content,
        message: spec.message,
        sha: null,
      },
      context,
    );
    return result.effect === 'conflict' ? 'found' : 'created';
  };

  // findsert the readme (explains the repo to any member who opens it)
  // note: lowercase readme.md per rule.forbid.shouts; github renders it case-insensitively
  const readmeEffect = scaffold({
    path: 'readme.md',
    content: getKeyrackInfraReadme({ org: input.org }),
    message: 'chore(keyrack-infra): scaffold readme',
  });

  // findsert the registry file (empty array scaffold)
  const registryEffect = scaffold({
    path: KEYRACK_INFRA_REGISTRY_PATH,
    content: '[]\n',
    message: 'chore(keyrack-infra): scaffold github-apps registry',
  });

  return { repo, repoEffect, readmeEffect, registryEffect };
};
