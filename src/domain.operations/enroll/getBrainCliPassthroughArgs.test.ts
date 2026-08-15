import { getBrainCliPassthroughArgs } from './getBrainCliPassthroughArgs';

interface TestCase {
  description: string;
  given: { args: string[]; positionalBrain: string | null };
  expect: string[];
}

const TEST_CASES: TestCase[] = [
  {
    description: 'drops the positional brain, keeps the passthrough',
    given: { args: ['claude', '--print', 'hello'], positionalBrain: 'claude' },
    expect: ['--print', 'hello'],
  },
  {
    description: 'drops --brain and its value (spaced form)',
    given: {
      args: ['--brain', 'claude', '--print', 'hi'],
      positionalBrain: null,
    },
    expect: ['--print', 'hi'],
  },
  {
    description: 'drops --as and its value',
    given: {
      args: ['claude', '--as', '@:driver', '--print'],
      positionalBrain: 'claude',
    },
    expect: ['--print'],
  },
  {
    description: 'drops -r / --roles and its value',
    given: {
      args: ['claude', '-r', '-driver', '--go'],
      positionalBrain: 'claude',
    },
    expect: ['--go'],
  },
  {
    description: 'drops the boolean --no-socket with no value',
    given: {
      args: ['claude', '--no-socket', '--print'],
      positionalBrain: 'claude',
    },
    expect: ['--print'],
  },
  {
    description: 'drops --output and --reason and their values',
    given: {
      args: ['claude', '--output', 'json', '--reason', 'why', 'tail'],
      positionalBrain: 'claude',
    },
    expect: ['tail'],
  },
  {
    description: 'drops the inline --flag=value forms',
    given: {
      args: ['claude', '--as=@:x', '--reason=y', '--print'],
      positionalBrain: 'claude',
    },
    expect: ['--print'],
  },
  {
    description:
      'a --brain enroll keeps a passthrough that happens to equal the brain word',
    given: {
      args: ['--brain', 'claude', 'claude'],
      positionalBrain: null,
    },
    expect: ['claude'],
  },
  {
    description: 'drops only the FIRST positional-brain occurrence',
    given: {
      args: ['claude', 'claude'],
      positionalBrain: 'claude',
    },
    expect: ['claude'],
  },
];

describe('getBrainCliPassthroughArgs', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(getBrainCliPassthroughArgs(thisCase.given)).toEqual(
        thisCase.expect,
      );
    }),
  );
});
