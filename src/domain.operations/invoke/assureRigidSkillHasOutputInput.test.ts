import { getError } from 'test-fns';
import { z } from 'zod';

import { ActorRoleSkill } from '@src/domain.objects/ActorRoleSkill';
import { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

import { assureRigidSkillHasOutputInput } from './assureRigidSkillHasOutputInput';

describe('assureRigidSkillHasOutputInput', () => {
  const exampleExecutable = new RoleSkillExecutable({
    slug: 'test-skill',
    path: '/path/to/skill.sh',
    slugRepo: 'test-repo',
    slugRole: 'test-role',
  });

  describe('given a rigid skill with output in schema.input', () => {
    const skill = new ActorRoleSkill({
      slug: 'test-skill',
      route: 'rigid',
      source: 'role.skills',
      schema: {
        input: z.object({
          topic: z.string(),
          output: z.string().optional(),
        }),
        output: z.object({ result: z.string() }),
      },
      executable: exampleExecutable,
    });

    it('should not throw an error', () => {
      expect(() => assureRigidSkillHasOutputInput({ skill })).not.toThrow();
    });
  });

  describe('given a rigid skill WITHOUT output in schema.input', () => {
    const skill = new ActorRoleSkill({
      slug: 'no-output-skill',
      route: 'rigid',
      source: 'role.skills',
      schema: {
        input: z.object({
          topic: z.string(),
          depth: z.number(),
        }),
        output: z.object({ result: z.string() }),
      },
      executable: exampleExecutable,
    });

    it('should throw BadRequestError', async () => {
      const error = await getError(() =>
        assureRigidSkillHasOutputInput({ skill }),
      );
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain(
        'rigid skill "no-output-skill" must declare "output" as input',
      );
    });
  });

  describe('given a skill with no schema', () => {
    const skill = new ActorRoleSkill({
      slug: 'no-schema-skill',
      route: 'rigid',
      source: 'role.skills',
      schema: undefined as any,
      executable: exampleExecutable,
    });

    it('should not throw an error (no validation required)', () => {
      expect(() => assureRigidSkillHasOutputInput({ skill })).not.toThrow();
    });
  });

  describe('given a skill with schema but no shape (e.g., z.any())', () => {
    const skill = new ActorRoleSkill({
      slug: 'any-schema-skill',
      route: 'rigid',
      source: 'role.skills',
      schema: {
        input: z.any(),
        output: z.any(),
      },
      executable: exampleExecutable,
    });

    it('should not throw an error (no shape to validate)', () => {
      expect(() => assureRigidSkillHasOutputInput({ skill })).not.toThrow();
    });
  });
});
