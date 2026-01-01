import { BadRequestError } from 'helpful-errors';
import path from 'path';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genBrainRepl } from './genBrainRepl';

const BRIEFS_DIR = path.join(
  __dirname,
  '../../../../.test/asset/example.briefs',
);

const outputSchema = z.object({ content: z.string() });

if (!process.env.OPENAI_API_KEY)
  throw new BadRequestError('OPENAI_API_KEY is required for integration tests');

describe('genBrainRepl.integration', () => {
  jest.setTimeout(60000);

  const brainRepl = genBrainRepl({ slug: 'openai/codex' });

  given('[case1] genBrainRepl({ slug: "openai/codex" })', () => {
    when('[t0] inspecting the repl', () => {
      then('repo is "openai"', () => {
        expect(brainRepl.repo).toEqual('openai');
      });

      then('slug is "codex"', () => {
        expect(brainRepl.slug).toEqual('codex');
      });

      then('description is defined', () => {
        expect(brainRepl.description).toBeDefined();
        expect(brainRepl.description.length).toBeGreaterThan(0);
      });
    });
  });

  given('[case2] ask is called (readonly mode)', () => {
    when('[t0] with simple prompt', () => {
      then('it returns a substantive response', async () => {
        const result = await brainRepl.ask({
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
        const result = await brainRepl.ask({
          role: { briefs },
          prompt: 'say hello',
          schema: { output: outputSchema },
        });
        expect(result.content).toBeDefined();
        expect(result.content).toContain('ZEBRA42');
      });
    });
  });

  given('[case3] act is called (read+write mode)', () => {
    when('[t0] with simple prompt', () => {
      then('it returns a substantive response', async () => {
        const result = await brainRepl.act({
          role: {},
          prompt: 'respond with exactly: hello from codex action',
          schema: { output: outputSchema },
        });
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content.toLowerCase()).toContain('hello');
      });
    });
  });
});
