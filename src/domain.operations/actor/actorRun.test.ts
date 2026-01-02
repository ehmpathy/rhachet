import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { ActorRoleSkill } from '@src/domain.objects/ActorRoleSkill';

import { actorRun } from './actorRun';

jest.mock('@src/domain.operations/invoke/executeSkill', () => ({
  executeSkill: jest.fn(),
}));

import { executeSkill } from '@src/domain.operations/invoke/executeSkill';

const mockExecuteSkill = executeSkill as jest.Mock;

describe('actorRun', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] a pre-resolved solid skill', () => {
    const testSkill = new ActorRoleSkill({
      slug: 'greet',
      route: 'solid',
      source: 'role.skills',
      schema: {
        input: z.object({ name: z.string() }),
        output: z.object({ message: z.string() }),
      },
      executable: {
        slug: 'greet',
        path: '/path/to/greet.sh',
        repoSlug: '.this',
        roleSlug: 'tester',
      },
    });

    when('[t0] actorRun is called with skill and args', () => {
      then('invokes executeSkill with converted CLI args', async () => {
        mockExecuteSkill.mockResolvedValue(undefined);

        await actorRun({
          skill: testSkill,
          args: { name: 'world' },
        });

        expect(mockExecuteSkill).toHaveBeenCalledTimes(1);
        expect(mockExecuteSkill).toHaveBeenCalledWith({
          skill: testSkill.executable,
          args: ['--name', 'world'],
          stream: false,
        });
      });
    });

    when('[t1] actorRun is called with multiple args', () => {
      then('converts all args to CLI format', async () => {
        mockExecuteSkill.mockResolvedValue(undefined);

        await actorRun({
          skill: testSkill,
          args: { name: 'world', count: 5 },
        });

        expect(mockExecuteSkill).toHaveBeenCalledWith({
          skill: testSkill.executable,
          args: ['--name', 'world', '--count', '5'],
          stream: false,
        });
      });
    });

    when('[t2] actorRun is called with empty args', () => {
      then('passes empty args array to executeSkill', async () => {
        mockExecuteSkill.mockResolvedValue(undefined);

        await actorRun({
          skill: testSkill,
          args: {},
        });

        expect(mockExecuteSkill).toHaveBeenCalledWith({
          skill: testSkill.executable,
          args: [],
          stream: false,
        });
      });
    });
  });

  given('[case2] executeSkill returns a result', () => {
    const testSkill = new ActorRoleSkill({
      slug: 'wordcount',
      route: 'solid',
      source: 'role.skills',
      schema: {
        input: z.object({ text: z.string() }),
        output: z.object({ count: z.number() }),
      },
      executable: {
        slug: 'wordcount',
        path: '/path/to/wordcount.sh',
        repoSlug: '.this',
        roleSlug: 'tester',
      },
    });

    when('[t0] actorRun completes', () => {
      then('returns the executeSkill result', async () => {
        const expectedResult = { count: 42 };
        mockExecuteSkill.mockResolvedValue(expectedResult);

        const result = await actorRun({
          skill: testSkill,
          args: { text: 'hello world' },
        });

        expect(result).toEqual(expectedResult);
      });
    });
  });
});
