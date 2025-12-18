/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { UnexpectedCodePathError } from 'helpful-errors';
import { Empty } from 'type-fns';

import { Stitch } from '@src/domain.objects/Stitch';
import { StitchStepImagine } from '@src/domain.objects/StitchStep';
import { GStitcher } from '@src/domain.objects/Stitcher';
import { Threads } from '@src/domain.objects/Threads';
import {
  ContextOpenAI,
  imagineViaOpenAI,
} from '@src/domain.operations/stitch/adapters/imagineViaOpenAI';

// an example of the kind of knowledge that can be embedded globally within the stitcher, rather than the thread.role
const getReviewTools = (input: {
  scope: 'technical' | 'functional';
  focus: 'blockers' | 'chances' | 'praises';
}): string[] => {
  const { scope, focus } = input;

  const base: string[] =
    scope === 'technical'
      ? [
          'leave a `//` comment above each paragraph of code, which we call a paragraph title; also, a newline above each `//` paragraph title',
          'if comment needs >1 line, extract to procedure with /** .what, .why */',
          'prefer procedural patterns: early returns, avoid deep nesting',
        ]
      : [
          'check if business edge cases are covered',
          'verify alignment with product requirements',
          'highlight logic that seems out of scope or brittle',
        ];

  const additions: Record<string, Record<string, string[]>> = {
    technical: {
      blockers: [
        'ensure naming is unambiguous and consistent with conventions',
        'check for consistency in pattern usage across codebase',
        "flag any logic that's tightly coupled or hard to extend",
      ],
      chances: [
        'suggest simple nitpicks (style, brevity, naming)',
        'recommend upgrades (pattern refactors, extraction chances)',
        'identify potential abstractions or DRY violations',
      ],
      praises: [
        'point out clean abstractions or elegant code structure',
        'highlight patterns that should be reused elsewhere',
      ],
    },
    functional: {
      blockers: [
        'spot missing validations or edge case handling',
        'check if any product requirement is unaddressed',
        'identify logic that could break in common scenarios',
      ],
      chances: [
        'suggest guardrails or fallbacks for risky flows',
        'recommend simplifications aligned with business intent',
        'note any logic that can be reused or centralized',
      ],
      praises: [
        'acknowledge clear mapping to product goals',
        'celebrate thoughtful handling of tricky logic',
        'highlight robustness in dealing with user scenarios',
      ],
    },
  };

  return [...base, ...(additions[scope]?.[focus] ?? [])];
};

export const genStitcherCodeReview = (input: {
  scope: 'technical' | 'functional';
  focus: 'blockers' | 'chances' | 'praises';
}) =>
  new StitchStepImagine<
    GStitcher<
      Threads<{
        director: Empty;
        critic: { tools: string[]; facts: string[] };
      }>,
      ContextOpenAI & GStitcher['context'],
      string
    >
  >({
    form: 'IMAGINE',
    slug: `[critic]:<code:review:${input.scope}:${input.focus}>`,
    stitchee: 'critic',
    readme: `intent(imagines constructive feedback over the latest state of code, focused on ${input.scope} ${input.focus})`,
    enprompt: ({ threads }) => {
      const tacticTools = getReviewTools(input);
      const combinedTools = [...tacticTools, ...threads.critic.context.tools];

      return [
        `imagine constructive ${input.scope} ${input.focus} feedback over the following code`,
        '',
        'context.tools = ',
        combinedTools.map((tool) => ` - ${tool}`).join('\n'),
        '',
        'context.facts = ',
        threads.critic.context.facts.map((fact) => ` - ${fact}`).join('\n'),
        '',
        'here is the current state of the code',
        threads.critic.stitches.slice(-1)[0]?.output?.content ??
          UnexpectedCodePathError.throw(
            'no prior stitch detected for code sample',
            { threads },
          ),
        '',
        ...(input.scope === 'functional'
          ? [
              'here is the functional directive',
              threads.director.stitches.slice(-1)[0]?.output,
            ]
          : []),
        '',
        `return a json object with shape { feedback: { scope: '${input.scope}', focus: '${input.focus}', importance: HIGH | MEDIUM | LOW, description: string, example: CodeBlockString }[] }`,
      ].join('\n');
    },
    imagine: imagineViaOpenAI,
    deprompt: ({ promptOut, promptIn }) => ({
      output: promptOut,
      input: promptIn,
    }),
  });
