/**
 * .what = type-level tests for CloneInmem skill inference across a role list
 * .why = verifies type-safe .act()/.run()/.ask() invocation via zod schemas,
 *   plus the union-across-roles capability (a clone reaches a skill from ANY
 *   of its actor's roles)
 *
 * .note = these tests run at compile time, not runtime
 *   if the file compiles, the type tests pass
 */
import { z } from 'zod';

import type { SkillInput, SkillOutput } from '@src/domain.objects/ActorInmem';
import type { CloneInmem } from '@src/domain.objects/CloneInmem';
import { Role } from '@src/domain.objects/Role';
import { ACTOR_ASK_DEFAULT_SCHEMA } from '@src/domain.operations/actor/actorAsk';

// define a role with typed skills for the type checks
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
        output: z.object({ salutation: z.string() }),
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

// a SECOND role — proves a clone reaches skills across its role UNION
const secondRole = new Role({
  slug: 'second-tester',
  name: 'Second Tester',
  purpose: 'second role for union checks',
  readme: { uri: '.test/readme.md' },
  traits: [],
  skills: {
    solid: {
      'waves.report': {
        input: z.object({ spot: z.string() }),
        output: z.object({ height: z.number() }),
      },
    },
    rigid: {
      'plan.session': {
        input: z.object({ level: z.string() }),
        output: z.object({ plan: z.string() }),
      },
    },
    dirs: { uri: '.agent/repo=.this/role=second-tester/skills' },
    refs: [],
  },
  briefs: { dirs: { uri: '.agent/repo=.this/role=second-tester/briefs' } },
});

type TypedRole = typeof typedRole;
type SecondRole = typeof secondRole;

/**
 * check: SkillInput extracts correct input type from schema
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
 * check: SkillOutput extracts correct output type from schema
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
 * check: clone.act() accepts only valid rigid skill names
 */
declare const typedClone: CloneInmem<[TypedRole]>;

// valid: summarize is a rigid skill
async () => {
  const result = await typedClone.act({
    skill: { summarize: { content: 'hello', maxLength: 100 } },
  });
  // positive: result should have summary property with correct type
  const _summary: string = result.output.summary;

  // negative: wrong property on result
  // @ts-expect-error - 'content' property does not exist on output { summary: string }
  const _content = result.output.content;

  // negative: wrong type assignment
  // @ts-expect-error - summary is string, not number
  const _wrongType: number = result.output.summary;
};

// valid: analyze is a rigid skill
async () => {
  const result = await typedClone.act({
    skill: { analyze: { data: [1, 2, 3] } },
  });
  // positive: result should have mean and median with correct types
  const _mean: number = result.output.mean;
  const _median: number = result.output.median;

  // negative: wrong property on result
  // @ts-expect-error - 'data' property does not exist on output { mean, median }
  const _data = result.output.data;

  // negative: wrong type assignment
  // @ts-expect-error - mean is number, not string
  const _wrongType: string = result.output.mean;
};

/**
 * check: clone.run() accepts only valid solid skill names
 */
// valid: wordcount is a solid skill
async () => {
  const result = await typedClone.run({
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
  const result = await typedClone.run({
    skill: { greet: { name: 'Alice', formal: true } },
  });
  // positive: result should have salutation property with correct type
  const _salutation: string = result.salutation;

  // negative: wrong property on result
  // @ts-expect-error - 'name' property does not exist on output { salutation: string }
  const _name = result.name;

  // negative: wrong type assignment
  // @ts-expect-error - salutation is string, not boolean
  const _wrongType: boolean = result.salutation;
};

/**
 * check: a clone over a role UNION reaches skills from EITHER role
 */
declare const unionClone: CloneInmem<[TypedRole, SecondRole]>;

// valid: 'summarize' comes from the first role
async () => {
  const result = await unionClone.act({
    skill: { summarize: { content: 'hi', maxLength: 10 } },
  });
  const _summary: string = result.output.summary;
};

// valid: 'plan.session' comes from the SECOND role
async () => {
  const result = await unionClone.act({
    skill: { 'plan.session': { level: 'beginner' } },
  });
  const _plan: string = result.output.plan;
};

// valid: 'waves.report' (solid) comes from the SECOND role
async () => {
  const result = await unionClone.run({
    skill: { 'waves.report': { spot: 'waikiki' } },
  });
  const _height: number = result.height;
};

// negative: a slug on NO role fails at compile time
async () => {
  // @ts-expect-error - 'unknown' is not a rigid skill on either role
  await unionClone.act({ skill: { unknown: { input: '...' } } });
};

/**
 * check: clone.ask() with default schema returns { answer: string }
 */
async () => {
  const result = await typedClone.ask({
    prompt: 'hello',
    schema: ACTOR_ASK_DEFAULT_SCHEMA,
  });

  // positive: answer exists
  const _answer: string = result.output.answer;

  // negative: response does not exist
  // @ts-expect-error - response property does not exist on { answer: string }
  const _response = result.output.response;
};

/**
 * check: clone.ask() with custom schema returns custom type
 */
async () => {
  const customSchema = z.object({ score: z.number(), label: z.string() });
  const result = await typedClone.ask({
    prompt: 'rate this',
    schema: { output: customSchema },
  });

  // positive: custom properties exist
  const _score: number = result.output.score;
  const _label: string = result.output.label;

  // negative: answer does not exist on custom schema
  // @ts-expect-error - answer property does not exist on { score: number, label: string }
  const _answer = result.output.answer;
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
describe('CloneInmem types', () => {
  it('should compile type tests successfully', () => {
    // if we reach here, all type tests above compiled successfully
    expect(true).toBe(true);
  });
});
