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

if (!process.env.XAI_API_KEY)
  throw new BadRequestError('XAI_API_KEY is required for integration tests');

describe('genBrainAtom.integration', () => {
  jest.setTimeout(30000);

  // use grok-3-mini for fast integration tests
  const brainAtom = genBrainAtom({ slug: 'xai/grok-3-mini' });

  given('[case1] genBrainAtom({ slug: "xai/grok-3-mini" })', () => {
    when('[t0] inspecting the atom', () => {
      then('repo is "xai"', () => {
        expect(brainAtom.repo).toEqual('xai');
      });

      then('slug is "xai/grok-3-mini"', () => {
        expect(brainAtom.slug).toEqual('xai/grok-3-mini');
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
