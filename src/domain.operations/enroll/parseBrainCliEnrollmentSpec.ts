import { BadRequestError } from 'helpful-errors';

import { BrainCliEnrollmentOperation } from '@src/domain.objects/BrainCliEnrollmentOperation';
import { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';

/**
 * .what = parses roles spec string into structured form
 * .why = enables validation and manipulation of enrollment operations
 *
 * .note = spec format:
 *   - "mechanic" → replace mode, add mechanic
 *   - "+architect" → delta mode, add architect
 *   - "-driver" → delta mode, remove driver
 *   - "-driver,+architect" → delta mode, remove driver then add architect
 *   - "mechanic,ergonomist" → replace mode, add both
 */
export const parseBrainCliEnrollmentSpec = (input: {
  spec: string;
}): BrainCliEnrollmentSpec => {
  // validate spec is not empty
  const trimmed = input.spec.trim();
  if (!trimmed)
    throw new BadRequestError('--roles is empty, omit flag to use defaults', {
      spec: input.spec,
    });

  // split by comma to get individual ops
  const parts = trimmed.split(',').map((p) => p.trim());

  // detect mode: delta if any part starts with + or -
  const hasDeltaOp = parts.some((p) => p.startsWith('+') || p.startsWith('-'));
  const mode = hasDeltaOp ? 'delta' : 'replace';

  // parse each part into an operation
  const ops: BrainCliEnrollmentOperation[] = parts.map((part) => {
    if (part.startsWith('+')) {
      const role = part.slice(1).trim();
      if (!role)
        throw new BadRequestError('role name cannot be empty after +', {
          spec: input.spec,
          part,
        });
      return new BrainCliEnrollmentOperation({ action: 'add', role });
    }

    if (part.startsWith('-')) {
      const role = part.slice(1).trim();
      if (!role)
        throw new BadRequestError('role name cannot be empty after -', {
          spec: input.spec,
          part,
        });
      return new BrainCliEnrollmentOperation({ action: 'remove', role });
    }

    // bare role name in replace mode
    if (mode === 'replace') {
      if (!part)
        throw new BadRequestError('role name cannot be empty', {
          spec: input.spec,
          part,
        });
      return new BrainCliEnrollmentOperation({ action: 'add', role: part });
    }

    // bare role name in delta mode is an error
    throw new BadRequestError(
      'in delta mode, all roles must be prefixed with + or -',
      { spec: input.spec, part },
    );
  });

  // check for conflicts: same role both added and removed
  const added = new Set(
    ops.filter((op) => op.action === 'add').map((op) => op.role),
  );
  const removed = new Set(
    ops.filter((op) => op.action === 'remove').map((op) => op.role),
  );
  const conflicts = [...added].filter((role) => removed.has(role));
  if (conflicts.length > 0)
    throw new BadRequestError(`cannot both add and remove '${conflicts[0]}'`, {
      spec: input.spec,
      conflicts,
    });

  return new BrainCliEnrollmentSpec({ mode, ops });
};
