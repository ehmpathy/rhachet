import { ContextLogTrail } from 'as-procedure';
import { pick } from 'type-fns';

export const genContextLogTrail = (): ContextLogTrail => ({
  log: {
    ...pick(console, ['debug', 'log', 'info', 'warn', 'error']),
    trail: [],
  },
});
