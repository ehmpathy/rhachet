import { BadRequestError } from 'helpful-errors';
import type { ZodSchema } from 'zod';

/**
 * .what = validates rigid skill declares `output` as input
 * .why = rigid skills must accept --output to support --attempts mode
 */
export const assureRigidSkillHasOutputInput = (input: {
  skill: {
    slug: string;
    schema?: { input?: ZodSchema };
  };
}): void => {
  // check if schema.input has 'output' property in its shape
  const inputSchema = input.skill.schema?.input;
  if (!inputSchema) return; // no schema = no validation required

  // attempt to access the shape of the zod schema
  const shape = (inputSchema as { shape?: Record<string, unknown> }).shape;
  if (!shape) return; // schema has no shape (e.g., z.any()) = no validation required

  // check for 'output' key in the shape
  const hasOutput = 'output' in shape;
  if (!hasOutput)
    BadRequestError.throw(
      `rigid skill "${input.skill.slug}" must declare "output" as input to support --attempts`,
      { skill: input.skill.slug },
    );
};
