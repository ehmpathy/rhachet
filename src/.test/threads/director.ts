import { Thread } from '@src/domain.objects/Thread';
import { ThreadContextRole } from '@src/domain.objects/Threads';

// todo: use enroleThread to add role context & apply role tools
export const exampleThreadDirector = Thread.build<
  Thread<ThreadContextRole<'director'> & { tools: string[]; facts: string[] }>
>({
  context: {
    role: 'director' as const,
    tools: [],
    facts: [],
  },
  stitches: [], // no history yet, by default
});
