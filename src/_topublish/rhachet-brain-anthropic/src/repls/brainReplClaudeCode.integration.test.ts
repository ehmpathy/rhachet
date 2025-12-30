import { BadRequestError } from 'helpful-errors';
import path from 'path';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { brainReplClaudeCode } from './brainReplClaudeCode';

const BRIEFS_DIR = path.join(
  __dirname,
  '../../../../.test/asset/example.briefs',
);

const outputSchema = z.object({ content: z.string() });

if (!process.env.ANTHROPIC_API_KEY)
  throw new BadRequestError(
    'ANTHROPIC_API_KEY is required for integration tests',
  );

describe('brainReplClaudeCode.integration', () => {
  jest.setTimeout(60000);

  given('[case1] brainReplClaudeCode instance', () => {
    when('[t0] inspecting the repl', () => {
      then('repo is "anthropic"', () => {
        expect(brainReplClaudeCode.repo).toEqual('anthropic');
      });

      then('slug is "claude-code"', () => {
        expect(brainReplClaudeCode.slug).toEqual('claude-code');
      });

      then('description is defined', () => {
        expect(brainReplClaudeCode.description).toBeDefined();
        expect(brainReplClaudeCode.description.length).toBeGreaterThan(0);
      });
    });
  });

  given('[case2] imagine is called', () => {
    when('[t0] with simple prompt', () => {
      then(
        'it returns a substantive response with extended thinking',
        async () => {
          const result = await brainReplClaudeCode.imagine({
            role: {},
            prompt: 'respond with exactly: hello from claude code',
            schema: { output: outputSchema },
          });
          expect(result.content).toBeDefined();
          expect(result.content.length).toBeGreaterThan(0);
          expect(result.content.toLowerCase()).toContain('hello');
        },
      );
    });

    when('[t1] with briefs', () => {
      then('response leverages knowledge from brief', async () => {
        const briefs = [
          genArtifactGitFile({
            uri: path.join(BRIEFS_DIR, 'secret-code.brief.md'),
          }),
        ];
        const result = await brainReplClaudeCode.imagine({
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
