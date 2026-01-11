/**
 * .what = type-level tests for Actor skill inference
 * .why = verifies type-safe skill invocation via zod schemas
 *
 * .note = these tests run at compile time, not runtime
 *   if the file compiles, the type tests pass
 */
import { z } from 'zod';

import type { Actor, SkillInput, SkillOutput } from '@src/domain.objects/Actor';
import { Role } from '@src/domain.objects/Role';

import { ACTOR_ASK_DEFAULT_SCHEMA } from './actorAsk';

// define a role with typed skills for testing
const typedRole = new Role({
  slug: 'typed-tester',
  name: 'Typed Tester',
  purpose: 'type test role',
  readme: { uri: '.test/readme.md' },
  traits: [],
  skills: {
    solid: {
      wordcount: {
        input: z.object({ text: z.string() }),
        output: z.object({ count: z.number() }),
      },
      greet: {
        input: z.object({ name: z.string(), formal: z.boolean() }),
        output: z.object({ greeting: z.string() }),
      },
    },
    rigid: {
      summarize: {
        input: z.object({ content: z.string(), maxLength: z.number() }),
        output: z.object({ summary: z.string() }),
      },
      analyze: {
        input: z.object({ data: z.array(z.number()) }),
        output: z.object({
          mean: z.number(),
          median: z.number(),
        }),
      },
    },
    dirs: { uri: '.agent/repo=.this/role=typed-tester/skills' },
    refs: [],
  },
  briefs: { dirs: { uri: '.agent/repo=.this/role=typed-tester/briefs' } },
});

type TypedRole = typeof typedRole;

/**
 * test: SkillInput extracts correct input type from schema
 */
type WordcountInput = SkillInput<
  NonNullable<TypedRole['skills']['solid']>['wordcount']
>;
// should be { text: string }
const _testWordcountInput: WordcountInput = { text: 'hello' };

type SummarizeInput = SkillInput<
  NonNullable<TypedRole['skills']['rigid']>['summarize']
>;
// should be { content: string, maxLength: number }
const _testSummarizeInput: SummarizeInput = {
  content: 'hello',
  maxLength: 100,
};

/**
 * test: SkillOutput extracts correct output type from schema
 */
type WordcountOutput = SkillOutput<
  NonNullable<TypedRole['skills']['solid']>['wordcount']
>;
// should be { count: number }
const _testWordcountOutput: WordcountOutput = { count: 5 };

type AnalyzeOutput = SkillOutput<
  NonNullable<TypedRole['skills']['rigid']>['analyze']
>;
// should be { mean: number, median: number }
const _testAnalyzeOutput: AnalyzeOutput = { mean: 5, median: 4 };

/**
 * test: Actor.act() accepts only valid rigid skill names
 */
declare const typedActor: Actor<TypedRole>;

// valid: summarize is a rigid skill
async () => {
  const result = await typedActor.act({
    skill: { summarize: { content: 'hello', maxLength: 100 } },
  });
  // positive: result should have summary property with correct type
  const _summary: string = result.summary;

  // negative: wrong property on result
  // @ts-expect-error - 'content' property does not exist on output { summary: string }
  const _content = result.content;

  // negative: wrong type assignment
  // @ts-expect-error - summary is string, not number
  const _wrongType: number = result.summary;
};

// valid: analyze is a rigid skill
async () => {
  const result = await typedActor.act({
    skill: { analyze: { data: [1, 2, 3] } },
  });
  // positive: result should have mean and median with correct types
  const _mean: number = result.mean;
  const _median: number = result.median;

  // negative: wrong property on result
  // @ts-expect-error - 'data' property does not exist on output { mean, median }
  const _data = result.data;

  // negative: wrong type assignment
  // @ts-expect-error - mean is number, not string
  const _wrongType: string = result.mean;
};

/**
 * test: Actor.run() accepts only valid solid skill names
 */
// valid: wordcount is a solid skill
async () => {
  const result = await typedActor.run({
    skill: { wordcount: { text: 'hello world' } },
  });
  // positive: result should have count property with correct type
  const _count: number = result.count;

  // negative: wrong property on result
  // @ts-expect-error - 'text' property does not exist on output { count: number }
  const _text = result.text;

  // negative: wrong type assignment
  // @ts-expect-error - count is number, not string
  const _wrongType: string = result.count;
};

// valid: greet is a solid skill
async () => {
  const result = await typedActor.run({
    skill: { greet: { name: 'Alice', formal: true } },
  });
  // positive: result should have greeting property with correct type
  const _greeting: string = result.greeting;

  // negative: wrong property on result
  // @ts-expect-error - 'name' property does not exist on output { greeting: string }
  const _name = result.name;

  // negative: wrong type assignment
  // @ts-expect-error - greeting is string, not boolean
  const _wrongType: boolean = result.greeting;
};

/**
 * test: Actor.ask() with default schema returns { answer: string }
 */
async () => {
  const result = await typedActor.ask({
    prompt: 'hello',
    schema: ACTOR_ASK_DEFAULT_SCHEMA,
  });

  // positive: answer exists
  const _answer: string = result.answer;

  // negative: response does not exist
  // @ts-expect-error - response property does not exist on { answer: string }
  const _response = result.response;
};

/**
 * test: Actor.ask() with custom schema returns custom type
 */
async () => {
  const customSchema = z.object({ score: z.number(), label: z.string() });
  const result = await typedActor.ask({
    prompt: 'rate this',
    schema: { output: customSchema },
  });

  // positive: custom properties exist
  const _score: number = result.score;
  const _label: string = result.label;

  // negative: answer does not exist on custom schema
  // @ts-expect-error - answer property does not exist on { score: number, label: string }
  const _answer = result.answer;
};

// verify type tests are used (prevents unused variable errors)
void _testWordcountInput;
void _testSummarizeInput;
void _testWordcountOutput;
void _testAnalyzeOutput;

/**
 * runtime test that validates the type tests compiled successfully
 * if this file compiles, all type tests pass
 */
describe('Actor types', () => {
  it('should compile type tests successfully', () => {
    // if we reach here, all type tests above compiled successfully
    expect(true).toBe(true);
  });
});
