import { getFile } from '@src/_topublish/file-fns/src/getFile';
import { Thread } from '@src/domain.objects/Thread';
import { ThreadContextRole } from '@src/domain.objects/Threads';
import { directoryTestAssets } from '@src/.test/directory';

// todo: use enroleThread to add role context & apply role tools
export const getExampleThreadCodeArtist = async (): Promise<
  Thread<ThreadContextRole<'artist'> & { tools: string[]; facts: string[] }>
> =>
  new Thread<
    ThreadContextRole<'artist'> & { tools: string[]; facts: string[] }
  >({
    context: {
      role: 'artist' as const,
      tools: [
        await getFile({
          path:
            directoryTestAssets +
            '/context/tools/codeDiffViaConflictMarkers.tactic.md',
        }),
      ],
      facts: [
        await getFile({
          path:
            directoryTestAssets + '/context/facts/codeEnvTypescript.scene.md',
        }),
      ],
    },
    stitches: [], // no history yet, by default
  });
