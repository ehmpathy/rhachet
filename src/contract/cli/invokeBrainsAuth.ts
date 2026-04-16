import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import { genBrainAuthAdapterForClaudeCode } from '@src/_topublish/rhachet-brains-anthropic/src/auth/genBrainAuthAdapterForClaudeCode';
import type { BrainAuthCredential } from '@src/domain.objects/BrainAuthCredential';
import { asBrainAuthSpecShape } from '@src/domain.operations/brainAuth/asBrainAuthSpecShape';
import { asBrainAuthTokenSlugs } from '@src/domain.operations/brainAuth/asBrainAuthTokenSlugs';
import {
  type ContextBrainAuth,
  getOneBrainAuthCredentialBySpec,
} from '@src/domain.operations/brainAuth/getOneBrainAuthCredentialBySpec';
import {
  genContextKeyrackGrantGet,
  getOneKeyrackGrantByKey,
} from '@src/domain.operations/keyrack';

/**
 * .what = builds brain auth context from keyrack
 * .why = enables domain operation to access keyrack credentials
 *
 * .note = for spike, rotation state is in-memory (not persisted)
 */
const genContextBrainAuth = async (input: {
  gitroot: string;
  owner: string | null;
}): Promise<ContextBrainAuth> => {
  // get keyrack context for credential access
  const keyrackContext = await genContextKeyrackGrantGet({
    gitroot: input.gitroot,
    owner: input.owner,
  });

  // create adapter for claude-code
  const adapter = genBrainAuthAdapterForClaudeCode();

  // in-memory rotation state (not persisted across processes)
  let lastIndex = -1;

  return {
    adapter,
    keyrack: {
      // return raw key names (no org/env filter for spike)
      async listKeys() {
        // extract key names from repo manifest if available
        if (!keyrackContext.repoManifest) return [];
        // keys are stored as Record<slug, spec> where slug = org.env.keyname
        const allKeyNames: string[] = [];
        for (const slug of Object.keys(keyrackContext.repoManifest.keys)) {
          // extract key name from slug (org.env.keyname)
          const parts = slug.split('.');
          const keyName = parts.slice(2).join('.'); // handle key names with dots
          allKeyNames.push(keyName);
        }
        return [...new Set(allKeyNames)]; // dedupe
      },
      async getCredential(query) {
        const attempt = await getOneKeyrackGrantByKey(
          {
            key: query.slug,
            env: null,
            org: undefined,
            allow: { dangerous: true },
          },
          keyrackContext,
        );
        if (attempt.status !== 'granted') return null;
        return {
          slug: query.slug,
          token: attempt.grant.key.secret,
        };
      },
    },
    rotationState: {
      async getLastIndex() {
        return lastIndex;
      },
      async setLastIndex(query) {
        lastIndex = query.index;
      },
    },
  };
};

/**
 * .what = adds the "brains auth" command group to the CLI
 * .why = enables brain auth credential management with pool rotation
 */
export const invokeBrainsAuth = ({ program }: { program: Command }): void => {
  const brains = program
    .command('brains')
    .description('manage brain configurations');

  const auth = brains
    .command('auth')
    .description('manage brain auth credentials');

  // brains auth supply --spec <spec>
  auth
    .command('supply')
    .description('supply a credential from the auth pool')
    .requiredOption(
      '--spec <spec>',
      'auth spec (e.g., pool(keyrack://org/env/KEY_*))',
    )
    .option('--owner <owner>', 'keyrack owner identity')
    .option(
      '--output <mode>',
      'output mode: value (raw), json, vibes (default)',
    )
    .option('--value', 'shorthand for --output value')
    .option('--json', 'shorthand for --output json')
    .action(
      async (opts: {
        spec: string;
        owner?: string;
        output?: 'value' | 'json' | 'vibes';
        value?: boolean;
        json?: boolean;
      }) => {
        // derive output mode
        const outputMode: 'value' | 'json' | 'vibes' = opts.value
          ? 'value'
          : (opts.output ?? (opts.json ? 'json' : 'vibes'));

        // get gitroot for keyrack context
        const gitroot = await getGitRepoRoot({ from: process.cwd() });

        // build context
        const context = await genContextBrainAuth({
          gitroot,
          owner: opts.owner ?? null,
        });

        // call domain operation
        const supplied = await getOneBrainAuthCredentialBySpec(
          { spec: opts.spec },
          context,
        );

        // output based on mode
        switch (outputMode) {
          case 'value': {
            process.stdout.write(supplied.formatted);
            break;
          }
          case 'json': {
            console.log(
              JSON.stringify(
                {
                  brainSlug: supplied.brainSlug,
                  credential: { slug: supplied.credential.slug },
                  formatted: supplied.formatted,
                },
                null,
                2,
              ),
            );
            break;
          }
          case 'vibes':
          default: {
            console.log('');
            console.log('🧠 brains auth supply');
            console.log(`   ├─ brain: ${supplied.brainSlug}`);
            console.log(`   ├─ credential: ${supplied.credential.slug}`);
            console.log(`   └─ status: supplied 🔑`);
            console.log('');
            break;
          }
        }
      },
    );

  // brains auth status --spec <spec>
  auth
    .command('status')
    .description('show capacity status for auth pool credentials')
    .requiredOption(
      '--spec <spec>',
      'auth spec (e.g., pool(keyrack://org/env/KEY_*))',
    )
    .option('--owner <owner>', 'keyrack owner identity')
    .option('--json', 'output as json')
    .action(async (opts: { spec: string; owner?: string; json?: boolean }) => {
      // get gitroot for keyrack context
      const gitroot = await getGitRepoRoot({ from: process.cwd() });

      // build context
      const context = await genContextBrainAuth({
        gitroot,
        owner: opts.owner ?? null,
      });

      // parse spec to get source
      const specShape = asBrainAuthSpecShape({ spec: opts.spec });
      if (!specShape.source) {
        throw new BadRequestError('spec has no source', { spec: opts.spec });
      }

      // expand slugs
      const availableKeys = await context.keyrack.listKeys({
        org: '',
        env: '',
      });
      const { slugs } = asBrainAuthTokenSlugs({
        source: specShape.source,
        availableKeys,
      });

      if (slugs.length === 0) {
        console.log('');
        console.log('🧠 brains auth status');
        console.log(`   └─ no credentials found for spec`);
        console.log('');
        return;
      }

      // load credentials
      const credentials: BrainAuthCredential[] = [];
      for (const slug of slugs) {
        const cred = await context.keyrack.getCredential({ slug });
        if (cred) credentials.push(cred);
      }

      // get capacity for each
      const capacities = await context.adapter.capacity.get.all({
        credentials,
      });

      // output
      if (opts.json) {
        console.log(JSON.stringify({ capacities }, null, 2));
      } else {
        console.log('');
        console.log('🧠 brains auth status');
        console.log(`   ├─ spec: ${opts.spec}`);
        console.log(`   ├─ credentials: ${capacities.length}`);
        for (let i = 0; i < capacities.length; i++) {
          const cap = capacities[i]!;
          const isLast = i === capacities.length - 1;
          const prefix = isLast ? '└─' : '├─';
          console.log(`   ${prefix} ${cap.credential.slug}`);
          console.log(`      ├─ used: ${cap.tokens.used}%`);
          console.log(`      ├─ left: ${cap.tokens.left}%`);
          console.log(
            `      └─ refresh: ${cap.refreshAt ?? 'capacity available'}`,
          );
        }
        console.log('');
      }
    });
};
