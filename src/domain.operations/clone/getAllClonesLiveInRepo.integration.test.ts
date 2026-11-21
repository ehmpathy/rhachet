import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';

import { getAllClonesLiveInRepo } from './getAllClonesLiveInRepo';
import { getCloneSocketPath } from './getCloneSocketPath';
import { genCloneSocketServer } from './socket/genCloneSocketServer';

/**
 * .what = the live-clone scan `brains auth use` names in its warn (case=7), over real clone dirs
 *   and a real socket
 * .note = the live clone's socket server is the one the clone runtime serves; the dead clone has a
 *   dir and no server, as a clone whose session ended leaves it
 */
describe('getAllClonesLiveInRepo', () => {
  given('[case1] a repo with no actors', () => {
    when('[t0] the live clones are read', () => {
      then('none are named', async () => {
        const repoPath = genTempDir({ slug: 'clones-live-none' });
        expect(await getAllClonesLiveInRepo({ repoPath })).toEqual([]);
      });
    });
  });

  given('[case2] a repo with one live clone and one dead clone', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'clones-live-mixed' });
      const serialLive = getUuid();
      await genSampleCloneOndisk({
        repoPath,
        serial: serialLive,
        slug: 'driver',
      });
      await genSampleCloneOndisk({
        repoPath,
        serial: getUuid(),
        slug: 'foreman',
      });
      const server = genCloneSocketServer({
        socketPath: getCloneSocketPath({ serial: serialLive })!,
        write: () => undefined,
        isBrainCliAlive: () => true,
        read: () => ({ live: false, reason: 'feed-not-live' }),
        settle: async () => {},
      });
      await server.ready;
      return { repoPath, server };
    });
    afterAll(async () => scene.server.close());

    when('[t0] the live clones are read', () => {
      const read = useBeforeAll(async () => ({
        clonesLive: await getAllClonesLiveInRepo({ repoPath: scene.repoPath }),
      }));

      then('only the clone whose socket answers is named', () => {
        expect(read.clonesLive).toEqual(['@:driver']);
      });

      then('the dead clone is never named', () => {
        expect(read.clonesLive.join(' ')).not.toContain('foreman');
      });
    });
  });
});
