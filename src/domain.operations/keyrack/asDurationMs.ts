import { UnexpectedCodePathError } from 'helpful-errors';

/**
 * .what = parse duration string to milliseconds
 * .why = supports human-readable duration formats
 */
export const asDurationMs = (input: { duration: string }): number => {
  const match = input.duration.match(/^(\d+)(h|m|s)$/);
  if (!match) {
    throw new UnexpectedCodePathError('invalid duration format', {
      duration: input.duration,
      note: 'expected format: 1h, 30m, 60s',
    });
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;

  switch (unit) {
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      throw new UnexpectedCodePathError('invalid duration unit', { unit });
  }
};
