/**
 * .what = type-level tests for BrainAtom schema inference
 * .why = verifies type-safe .ask() output via zod schemas
 *
 * .note = these tests run at compile time, not runtime
 *   if the file compiles, the type tests pass
 */
import { z } from 'zod';

import type { BrainAtom } from './BrainAtom';

// declare a mock brain atom for type testing
declare const brainAtom: BrainAtom;

/**
 * test: .ask() with default schema returns inferred type
 */
async () => {
  const schema = z.object({ answer: z.string() });
  const result = await brainAtom.ask({
    role: {},
    prompt: 'hello',
    schema: { output: schema },
  });

  // positive: answer exists and is string
  const _answer: string = result.answer;

  // negative: nonexistent property
  // @ts-expect-error - 'wrong' property does not exist on { answer: string }
  const _wrong = result.wrong;
};

/**
 * test: .ask() with custom schema returns custom type
 */
async () => {
  const schema = z.object({
    score: z.number(),
    label: z.string(),
    tags: z.array(z.string()),
  });
  const result = await brainAtom.ask({
    role: {},
    prompt: 'rate this',
    schema: { output: schema },
  });

  // positive: custom properties exist with correct types
  const _score: number = result.score;
  const _label: string = result.label;
  const _tags: string[] = result.tags;

  // negative: answer does not exist on custom schema
  // @ts-expect-error - 'answer' property does not exist on custom schema
  const _answer = result.answer;

  // negative: wrong type assignment
  // @ts-expect-error - score is number, not string
  const _wrongType: string = result.score;
};

/**
 * test: .ask() with nested schema returns nested type
 */
async () => {
  const schema = z.object({
    user: z.object({
      name: z.string(),
      age: z.number(),
    }),
    metadata: z.object({
      createdAt: z.string(),
    }),
  });
  const result = await brainAtom.ask({
    role: {},
    prompt: 'get user',
    schema: { output: schema },
  });

  // positive: nested properties accessible
  const _name: string = result.user.name;
  const _age: number = result.user.age;
  const _createdAt: string = result.metadata.createdAt;

  // negative: wrong nested property
  // @ts-expect-error - 'email' does not exist on user
  const _email = result.user.email;
};

/**
 * test: schema is required
 */
async () => {
  // @ts-expect-error - schema is required
  await brainAtom.ask({
    role: {},
    prompt: 'hello',
  });
};

/**
 * runtime test that validates the type tests compiled successfully
 * if this file compiles, all type tests pass
 */
describe('BrainAtom types', () => {
  it('should compile type tests successfully', () => {
    // if we reach here, all type tests above compiled successfully
    expect(true).toBe(true);
  });
});
