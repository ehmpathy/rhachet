import { UnexpectedCodePathError } from 'helpful-errors';

/**
 * .what = resolves the home directory
 * .why = uses HOME env var to support test isolation
 *
 * .note = os.homedir() caches at module load; we read process.env.HOME directly
 */
export const getHomeDir = (): string => {
  const home = process.env.HOME;
  if (!home)
    throw new UnexpectedCodePathError('HOME not set', {
      hint: 'HOME environment variable is required',
    });
  return home;
};
