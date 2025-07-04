import { getFile } from '../../__nonpublished_modules__/file-fns/src/getFile';
import { Thread } from '../../domain/objects/Thread';
import { ThreadContextRole } from '../../domain/objects/Threads';
import { directoryTestAssets } from '../directory';

// todo: use enroleThread to add role context & apply role tools
export const getExampleThreadCodeCritic = async (): Promise<
  Thread<ThreadContextRole<'critic'> & { tools: string[]; facts: string[] }>
> =>
  new Thread<
    ThreadContextRole<'critic'> & { tools: string[]; facts: string[] }
  >({
    context: {
      role: 'critic' as const,
      tools: [],
      facts: [
        await getFile({
          path:
            directoryTestAssets + '/context/facts/codeEnvTypescript.scene.md',
        }),
      ],
    },
    stitches: [], // no history yet, by default
  });
