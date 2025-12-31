import { BadRequestError } from 'helpful-errors';
import path from 'path';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { brainReplCodex } from './brainReplCodex';

const BRIEFS_DIR = path.join(
  __dirname,
  '../../../../.test/asset/example.briefs',
);

const outputSchema = z.object({ content: z.string() });

if (!process.env.OPENAI_API_KEY)
  throw new BadRequestError('OPENAI_API_KEY is required for integration tests');

describe('brainReplCodex.integration', () => {
  jest.setTimeout(60000);

  given('[case1] brainReplCodex instance', () => {
    when('[t0] inspecting the repl', () => {
      then('repo is "openai"', () => {
        expect(brainReplCodex.repo).toEqual('openai');
      });

      then('slug is "codex"', () => {
        expect(brainReplCodex.slug).toEqual('codex');
      });

      then('description is defined', () => {
        expect(brainReplCodex.description).toBeDefined();
        expect(brainReplCodex.description.length).toBeGreaterThan(0);
      });
    });
  });

  given('[case2] imagine is called', () => {
    when('[t0] with simple prompt', () => {
      then('it returns a substantive response with reasoning', async () => {
        const result = await brainReplCodex.imagine({
          role: {},
          prompt: 'respond with exactly: hello from codex',
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
        const result = await brainReplCodex.imagine({
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
