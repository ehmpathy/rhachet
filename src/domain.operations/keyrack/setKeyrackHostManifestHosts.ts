import { MalfunctionError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import {
  KeyrackHostManifest,
  type KeyrackKeyHost,
} from '@src/domain.objects/keyrack';
import { getHomeDir } from '@src/infra/getHomeDir';
import { withHostMutex } from '@src/infra/lock/withHostMutex';

import type { ContextKeyrack } from './genContextKeyrack';
import { getKeyrackHostManifestPath } from './getKeyrackHostManifestPath';

/**
 * .what = rewrite the host manifest's hosts under the host mutex: re-read, mutate, write
 * .why = the manifest is one file per owner, shared by every repo on the box. a write that rests
 *   on the copy `context.hostManifest` held since context build drops every key a peer process
 *   filed since then. so the read moves under the lock, and the mutation applies to that read
 *
 * .note = `mutate` returns null when the fresh hosts already hold the desired state; no write then
 * .note = refreshes `context.hostManifest`, so later reads in this process see the write
 * .note = NOT reentrant (withHostMutex): never call it from within a held host mutex on the same file
 */
export const setKeyrackHostManifestHosts = async (
  input: {
    mutate: (input: {
      hosts: Record<string, KeyrackKeyHost>;
    }) => Record<string, KeyrackKeyHost> | null;
  },
  context: ContextKeyrack,
): Promise<{ manifest: KeyrackHostManifest; changed: boolean }> =>
  withHostMutex(
    {
      home: getHomeDir(),
      path: getKeyrackHostManifestPath({ owner: context.owner }),
    },
    async () => {
      // re-read within the hold, so the mutation rests on the latest write of any peer
      const loaded = await daoKeyrackHostManifest.get(
        { owner: context.owner },
        context,
      );
      if (!loaded)
        throw new MalfunctionError(
          'host manifest vanished under the lock; it was loaded before',
          {
            owner: context.owner,
            hint: `a peer process removed the manifest mid-write; rhx keyrack init --owner ${context.owner ?? 'default'}, then retry`,
          },
        );

      // apply the mutation; null means the hosts already hold it
      const hostsNext = input.mutate({ hosts: loaded.manifest.hosts });
      if (!hostsNext) return { manifest: loaded.manifest, changed: false };

      // persist, and refresh the context copy
      const manifestNext = new KeyrackHostManifest({
        ...loaded.manifest,
        hosts: hostsNext,
      });
      await daoKeyrackHostManifest.set({ upsert: manifestNext });
      context.hostManifest = manifestNext;
      return { manifest: manifestNext, changed: true };
    },
  );
