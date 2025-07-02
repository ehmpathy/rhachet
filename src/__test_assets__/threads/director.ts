import { Thread } from '../../domain/objects/Thread';
import { ThreadContextRole } from '../../domain/objects/Threads';

// todo: use enroleThread to add role context & apply role tools
export const exampleThreadDirector = new Thread<
  ThreadContextRole<'director'> & { tools: string[]; facts: string[] }
>({
  context: {
    role: 'director' as const,
    tools: [],
    facts: [],
  },
  stitches: [], // no history yet, by default
});
