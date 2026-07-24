import { UnexpectedCodePathError } from 'helpful-errors';

import type {
  GhRun,
  GhRunResult,
} from '@src/domain.operations/keyrack/infra/gh/runGh';

/**
 * .what = an in-memory fake of the `gh` cli for hermetic tests
 * .why = the injected GhRun seam lets every infra operation be tested without
 *        real github calls or creds; this fake models real behavior (findsert
 *        repos, sha-guarded file writes, 404s, org-install forbidden) so that
 *        idempotency and error paths are exercised for real, not mocked away
 *
 * .note = this is a fake (stateful, behaves like the real thing), not a stub —
 *         it enforces the same sha optimistic-lock github does
 */
export const genMockGhRun = (input?: {
  /** repos that already exist (org/name slugs), private by default */
  repos?: string[];
  /** repos that already exist but are public (also count as present) */
  reposPublic?: string[];
  /** files already present, content as plain utf-8 */
  files?: { repo: string; path: string; content: string }[];
  /** org install-list behavior; default = empty, non-forbidden */
  orgInstalls?:
    | { forbidden: true }
    | {
        forbidden: false;
        installs: { appId: string; installationId: string; slug: string }[];
      };
}): GhRun => {
  // in-memory state
  const reposPublic = new Set<string>(input?.reposPublic ?? []);
  const reposPresent = new Set<string>([
    ...(input?.repos ?? []),
    ...reposPublic, // a public repo also exists
  ]);
  const filesByKey = new Map<string, { contentBase64: string; sha: string }>();

  // monotonic sha source; the counter lives in a closed-over holder so callers
  // stay const (deliberate, isolated mutation for a test double)
  const shaState = { count: 0 };
  const nextSha = (): string => {
    shaState.count += 1;
    return `sha${shaState.count}`;
  };

  // seed initial files (and imply their repos exist)
  for (const seed of input?.files ?? []) {
    reposPresent.add(seed.repo);
    filesByKey.set(`${seed.repo}::${seed.path}`, {
      contentBase64: Buffer.from(seed.content, 'utf-8').toString('base64'),
      sha: nextSha(),
    });
  }

  // default org-install behavior: reachable but empty
  const orgInstalls = input?.orgInstalls ?? { forbidden: false, installs: [] };

  const ok = (stdout: string): GhRunResult => ({ status: 0, stdout, stderr: '' });
  const fail = (stderr: string): GhRunResult => ({
    status: 1,
    stdout: '',
    stderr,
  });

  // map a `/repos/{owner}/{repo}/contents/{path}` api path to our state key
  const asFileKey = (apiPath: string): string => {
    const parts = apiPath.match(/^\/repos\/([^/]+\/[^/]+)\/contents\/(.+)$/);
    if (!parts)
      throw new UnexpectedCodePathError('fake gh: bad contents api path', {
        apiPath,
        hint: 'a test drove the fake gh with a contents path it does not model; fix the test fixture',
      });
    return `${parts[1]}::${parts[2]}`;
  };

  // parse `-f key=value` pairs from gh api args (immutable reduce over entries)
  const asFields = (args: string[]): Record<string, string> =>
    args.reduce<Record<string, string>>((fields, arg, i) => {
      if (arg !== '-f') return fields;
      const raw = args[i + 1];
      if (!raw) return fields;
      const eq = raw.indexOf('=');
      return { ...fields, [raw.slice(0, eq)]: raw.slice(eq + 1) };
    }, {});

  return ({ args }) => {
    // gh repo view $slug --json name  (or --json visibility)
    if (args[0] === 'repo' && args[1] === 'view') {
      const slug = args[2]!;
      // note: literal 404 stderr text mirrors what the real gh cli emits
      if (!reposPresent.has(slug))
        return fail('GraphQL: Could not resolve to a Repository (HTTP 404)');
      // mirror real gh: visibility is an uppercase enum; public repos read PUBLIC
      return ok(
        JSON.stringify({
          name: slug,
          visibility: reposPublic.has(slug) ? 'PUBLIC' : 'PRIVATE',
        }),
      );
    }

    // gh repo create $slug --private
    if (args[0] === 'repo' && args[1] === 'create') {
      const slug = args[2]!;
      if (reposPresent.has(slug)) return fail('HTTP 422: name already exists');
      reposPresent.add(slug);
      return ok('');
    }

    // gh api --method PUT /repos/{repo}/contents/{path} -f ...
    if (args[0] === 'api' && args[1] === '--method' && args[2] === 'PUT') {
      const key = asFileKey(args[3]!);
      const fields = asFields(args);
      const prior = filesByKey.get(key);

      // sha-guard: an update must present the current sha (github 409 otherwise)
      if (prior && fields.sha !== prior.sha)
        return fail('HTTP 409: sha does not match');

      filesByKey.set(key, { contentBase64: fields.content ?? '', sha: nextSha() });
      return ok('{}');
    }

    // gh api /repos/{repo}/contents/{path}   (read)
    if (
      args[0] === 'api' &&
      typeof args[1] === 'string' &&
      args[1].startsWith('/repos/') &&
      args[1].includes('/contents/')
    ) {
      const file = filesByKey.get(asFileKey(args[1]));
      if (!file) return fail('HTTP 404: Not Found');
      return ok(JSON.stringify({ content: file.contentBase64, sha: file.sha }));
    }

    // gh api /orgs/{org}/installations
    if (
      args[0] === 'api' &&
      typeof args[1] === 'string' &&
      /^\/orgs\/[^/]+\/installations$/.test(args[1])
    ) {
      if (orgInstalls.forbidden)
        return fail('HTTP 403: must be an organization owner');
      return ok(
        JSON.stringify({
          installations: orgInstalls.installs.map((one) => ({
            id: Number(one.installationId),
            app_id: Number(one.appId),
            app_slug: one.slug,
          })),
        }),
      );
    }

    return fail(`fake gh: unhandled args ${args.join(' ')}`);
  };
};
