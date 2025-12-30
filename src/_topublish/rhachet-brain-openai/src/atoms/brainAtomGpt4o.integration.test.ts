import { BadRequestError } from 'helpful-errors';
import path from 'path';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { brainAtomGpt4o } from './brainAtomGpt4o';

const BRIEFS_DIR = path.join(
  __dirname,
  '../../../../.test/asset/example.briefs',
);

const outputSchema = z.object({ content: z.string() });

if (!process.env.OPENAI_API_KEY)
  throw new BadRequestError('OPENAI_API_KEY is required for integration tests');

describe('brainAtomGpt4o.integration', () => {
  jest.setTimeout(30000);

  given('[case1] brainAtomGpt4o instance', () => {
    when('[t0] inspecting the atom', () => {
      then('repo is "openai"', () => {
        expect(brainAtomGpt4o.repo).toEqual('openai');
      });

      then('slug is "gpt-4o"', () => {
        expect(brainAtomGpt4o.slug).toEqual('gpt-4o');
      });

      then('description is defined', () => {
        expect(brainAtomGpt4o.description).toBeDefined();
        expect(brainAtomGpt4o.description.length).toBeGreaterThan(0);
      });
    });
  });

  given('[case2] imagine is called', () => {
    when('[t0] with simple prompt', () => {
      then('it returns a substantive response', async () => {
        const result = await brainAtomGpt4o.imagine({
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
        const result = await brainAtomGpt4o.imagine({
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
