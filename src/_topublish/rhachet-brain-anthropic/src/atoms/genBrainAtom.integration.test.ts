import { BadRequestError } from 'helpful-errors';
import path from 'path';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genBrainAtom } from './genBrainAtom';

const BRIEFS_DIR = path.join(
  __dirname,
  '../../../../.test/asset/example.briefs',
);

const outputSchema = z.object({ content: z.string() });

if (!process.env.ANTHROPIC_API_KEY)
  throw new BadRequestError(
    'ANTHROPIC_API_KEY is required for integration tests',
  );

describe('genBrainAtom.integration', () => {
  jest.setTimeout(30000);

  // use haiku for fast integration tests
  const brainAtom = genBrainAtom({ slug: 'claude/haiku' });

  given('[case1] genBrainAtom({ slug: "claude/haiku" })', () => {
    when('[t0] inspecting the atom', () => {
      then('repo is "anthropic"', () => {
        expect(brainAtom.repo).toEqual('anthropic');
      });

      then('slug is "claude/haiku"', () => {
        expect(brainAtom.slug).toEqual('claude/haiku');
      });

      then('description is defined', () => {
        expect(brainAtom.description).toBeDefined();
        expect(brainAtom.description.length).toBeGreaterThan(0);
      });
    });
  });

  given('[case2] ask is called', () => {
    when('[t0] with simple prompt', () => {
      then('it returns a substantive response', async () => {
        const result = await brainAtom.ask({
          role: {},
          prompt: 'respond with exactly: hello world',
          schema: { output: outputSchema },
        });
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content.toLowerCase()).toContain('hello');
      });
    });

    when('[t1] with briefs', () => {
      then('response leverages knowledge from brief', async () => {
        const briefs = [
          genArtifactGitFile({
            uri: path.join(BRIEFS_DIR, 'secret-code.brief.md'),
          }),
        ];
        const result = await brainAtom.ask({
          role: { briefs },
          prompt: 'say hello',
          schema: { output: outputSchema },
        });
        expect(result.content).toBeDefined();
        expect(result.content).toContain('ZEBRA42');
      });
    });
  });
});
