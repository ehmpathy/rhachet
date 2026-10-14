import { given, then, when } from 'test-fns';

import { asBrainCliSpawnArgs } from './asBrainCliSpawnArgs';
import { getAllBrainCliSettingsLayers } from './getAllBrainCliSettingsLayers';

const brainDir = '/repo/.agent/.actors/actor.via.hash=abc/brain/.claude';
const cwd = '/repo';

describe('getAllBrainCliSettingsLayers', () => {
  given('[case1] the argv enroll builds', () => {
    when('[t0] the layers are read off it', () => {
      then(
        'they are the user layer and the actor settings.of.repo.json, no more',
        () => {
          const args = asBrainCliSpawnArgs({
            configPath: `${brainDir}/settings.of.repo.json`,
            passthrough: [],
          });
          expect(getAllBrainCliSettingsLayers({ args, brainDir, cwd })).toEqual(
            [
              { source: 'user', path: `${brainDir}/settings.json` },
              { source: 'flag', path: `${brainDir}/settings.of.repo.json` },
            ],
          );
        },
      );
    });
  });

  given('[case2] an argv with no --setting-sources', () => {
    when('[t0] the layers are read off it', () => {
      then('all three sources are read, as claude does by default', () => {
        expect(
          getAllBrainCliSettingsLayers({ args: [], brainDir, cwd }).map(
            (layer) => layer.source,
          ),
        ).toEqual(['user', 'project', 'local']);
      });
    });
  });

  given('[case3] an argv with inline and repeated flags', () => {
    when('[t0] the layers are read off it', () => {
      then('every source and every --settings file is a layer', () => {
        const args = [
          '--setting-sources=user,local',
          '--settings',
          '/a.json',
          '--settings=/b.json',
        ];
        expect(getAllBrainCliSettingsLayers({ args, brainDir, cwd })).toEqual([
          { source: 'user', path: `${brainDir}/settings.json` },
          { source: 'local', path: `${cwd}/.claude/settings.local.json` },
          { source: 'flag', path: '/a.json' },
          { source: 'flag', path: '/b.json' },
        ]);
      });
    });
  });
});
