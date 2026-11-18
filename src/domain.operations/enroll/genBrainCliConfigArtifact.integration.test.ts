import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { BrainCliEnrollmentManifest } from '@src/domain.objects/BrainCliEnrollmentManifest';
import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

import { EventEmitter, once } from 'node:events';
import { asBrainCliSpawnArgs } from './asBrainCliSpawnArgs';
import { genBrainCliConfigArtifact } from './genBrainCliConfigArtifact';
import { getClaudeMdExcludesList } from './getClaudeMdExcludesList';

const HASH_EXID = 'hash=abc12345';
const REPO_EXID = 'repo=ambient';

/**
 * .what = the brain dir of an actor in a test repo
 */
const asBrainDir = (input: { repoPath: string; exid: string }): string =>
  path.join(
    input.repoPath,
    '.agent',
    '.actors',
    `actor.via.${input.exid}`,
    'brain',
    '.claude',
  );

describe('genBrainCliConfigArtifact', () => {
  /**
   * .what = creates a temp repo whose repo actor holds the given settings.of.repo.json
   * .why = isolated test environment; the repo actor is the one source
   */
  const createTestRepo = async (
    settings: ClaudeCodeSettings,
  ): Promise<string> => {
    const repoPath = genTempDir({ slug: 'gen-brain-cli-config-artifact' });
    const brainDir = asBrainDir({ repoPath, exid: REPO_EXID });
    await fs.mkdir(brainDir, { recursive: true });
    await fs.writeFile(
      path.join(brainDir, 'settings.of.repo.json'),
      JSON.stringify(settings, null, 2),
    );
    return repoPath;
  };

  given('[case1] repo with hooks from multiple roles', () => {
    const settingsWithHooks: ClaudeCodeSettings = {
      permissions: { allow: ['Bash(npm run build)'] },
      hooks: {
        SessionStart: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: 'echo mechanic boot',
                author: 'repo=ehmpathy/role=mechanic',
              },
              {
                type: 'command',
                command: 'echo driver boot',
                author: 'repo=ehmpathy/role=driver',
              },
              {
                type: 'command',
                command: 'echo ergonomist boot',
                author: 'repo=ehmpathy/role=ergonomist',
              },
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: 'echo mechanic tool',
                author: 'repo=ehmpathy/role=mechanic',
              },
            ],
          },
        ],
      },
    };

    const scene = useBeforeAll(async () => {
      const repoPath = await createTestRepo(settingsWithHooks);
      return { repoPath };
    });

    when('[t0] a hash actor enrolled with only the mechanic role', () => {
      const result = useBeforeAll(async () =>
        genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic'],
          }),
          exid: HASH_EXID,
          repoPath: scene.repoPath,
        }),
      );

      then("writes the actor's own settings.of.repo.json", () => {
        expect(result.configPath).toEqual(
          path.join(
            asBrainDir({ repoPath: scene.repoPath, exid: HASH_EXID }),
            'settings.of.repo.json',
          ),
        );
      });

      then('includes only mechanic hooks', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        const settings = JSON.parse(content) as ClaudeCodeSettings;

        expect(settings.hooks?.SessionStart).toHaveLength(1);
        expect(settings.hooks?.SessionStart?.[0]?.hooks).toHaveLength(1);
        expect(settings.hooks?.SessionStart?.[0]?.hooks?.[0]?.author).toContain(
          'role=mechanic',
        );
        expect(settings.hooks?.PreToolUse).toHaveLength(1);
        expect(settings.hooks?.PreToolUse?.[0]?.hooks).toHaveLength(1);
        expect(settings.hooks?.PreToolUse?.[0]?.hooks?.[0]?.author).toContain(
          'role=mechanic',
        );
      });

      then('excludes driver and ergonomist hooks', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        expect(content).not.toContain('role=driver');
        expect(content).not.toContain('role=ergonomist');
      });

      then('keeps the permissions of the repo actor', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        const settings: ClaudeCodeSettings = JSON.parse(content);
        expect(settings.permissions).toEqual({
          allow: ['Bash(npm run build)'],
        });
      });

      then(
        'carries claudeMdExcludes for every repo door (D5, D12)',
        async () => {
          const content = await fs.readFile(result.configPath, 'utf-8');
          const settings = JSON.parse(content) as {
            claudeMdExcludes?: string[];
          };
          expect(settings.claudeMdExcludes).toEqual(
            getClaudeMdExcludesList({
              repoPath: scene.repoPath,
              repoActorBrainDir: asBrainDir({
                repoPath: scene.repoPath,
                exid: REPO_EXID,
              }),
              home: os.homedir(),
            }),
          );
        },
      );
    });

    when('[t1] the repo actor itself', () => {
      const result = useBeforeAll(async () =>
        genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic', 'driver', 'ergonomist'],
          }),
          exid: REPO_EXID,
          repoPath: scene.repoPath,
        }),
      );

      then('writes the source file in place', () => {
        expect(result.configPath).toEqual(
          path.join(
            asBrainDir({ repoPath: scene.repoPath, exid: REPO_EXID }),
            'settings.of.repo.json',
          ),
        );
      });

      then('keeps every hook — the source is never narrowed', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        const settings = JSON.parse(content) as ClaudeCodeSettings;
        expect(settings.hooks).toEqual(settingsWithHooks.hooks);
      });

      then('never excludes its own doors — they are its own boot', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        const settings: { claudeMdExcludes: string[] } = JSON.parse(content);
        const ownBrainDir = asBrainDir({
          repoPath: scene.repoPath,
          exid: REPO_EXID,
        });
        expect(
          settings.claudeMdExcludes.filter(
            (p) =>
              p.startsWith(`${ownBrainDir}/`) ||
              p.startsWith(`${path.join(scene.repoPath, '.claude')}/`),
          ),
        ).toEqual([]);
        expect(settings.claudeMdExcludes).toContain(
          path.join(os.homedir(), '.claude', 'CLAUDE.md'),
        );
      });
    });
  });

  given('[case2] repo with no hooks', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = await createTestRepo({});
      return { repoPath };
    });

    when('[t0] enroll with mechanic role', () => {
      const result = useBeforeAll(async () =>
        genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic'],
          }),
          exid: HASH_EXID,
          repoPath: scene.repoPath,
        }),
      );

      then('config has no hooks section', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        const settings = JSON.parse(content) as ClaudeCodeSettings;
        expect(settings.hooks).toBeUndefined();
      });
    });
  });

  given('[case3] repo with no repo actor dir yet', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'brain-cli-config-empty' });
      await fs.mkdir(repoPath, { recursive: true });
      return { repoPath };
    });

    when('[t0] enroll with mechanic role', () => {
      const result = useBeforeAll(async () =>
        genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic'],
          }),
          exid: HASH_EXID,
          repoPath: scene.repoPath,
        }),
      );

      then("creates the actor's brain dir and writes its config", async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        expect(JSON.parse(content)).toHaveProperty('claudeMdExcludes');
      });
    });
  });

  given('[case4] unsupported brain', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = await createTestRepo({});
      return { repoPath };
    });

    when('[t0] enroll with unsupported brain "openai"', () => {
      then('throws error', async () => {
        await expect(
          genBrainCliConfigArtifact({
            enrollment: new BrainCliEnrollmentManifest({
              brain: 'openai',
              roles: ['mechanic'],
            }),
            exid: HASH_EXID,
            repoPath: scene.repoPath,
          }),
        ).rejects.toThrow("brain 'openai' not supported");
      });
    });
  });

  given('[case5] role with no hooks in config', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = await createTestRepo({
        hooks: {
          SessionStart: [
            {
              matcher: '# author=repo=ehmpathy/role=mechanic .*',
              hooks: [{ type: 'command', command: 'echo mechanic boot' }],
            },
          ],
        },
      });
      return { repoPath };
    });

    when('[t0] enroll with architect role that has no hooks', () => {
      const result = useBeforeAll(async () =>
        genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['architect'],
          }),
          exid: HASH_EXID,
          repoPath: scene.repoPath,
        }),
      );

      then('writes a config with empty hooks', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        const settings = JSON.parse(content) as ClaudeCodeSettings;
        expect(settings.hooks).toEqual({});
      });
    });
  });

  given(
    '[case6] a peer holds the repo actor settings mutex mid read-modify-write',
    () => {
      when(
        '[t0] the repo actor is derived while the peer writes a new hook',
        () => {
          then(
            "the derivation waits, then keeps the peer's hook beside its own excludes",
            async () => {
              // the repo actor's derivation reads and writes ONE file; a peer `rhx` (a hook
              //   sync in its shield) that writes a hook to that file under its mutex must
              //   never have the hook dropped by this whole-file write. for the repo actor the
              //   source and the target are one file, so this also proves the derivation takes
              //   that one mutex once, never twice
              const repoPath = await createTestRepo({ hooks: {} });
              const brainDir = asBrainDir({ repoPath, exid: REPO_EXID });
              const settingsPath = path.join(brainDir, 'settings.of.repo.json');
              const gate = new EventEmitter();
              const peerSignal = new EventEmitter();
              const peerHeld = once(peerSignal, 'held');
              const peer = withRepoMutex(
                { repoPath, path: settingsPath },
                async () => {
                  peerSignal.emit('held');
                  await once(gate, 'release');
                },
              );
              await peerHeld;
              // .mock = `process.stderr.write`, silenced for this case, restored in `finally`
              // .why = the derivation waits on the peer's mutex, and the mutex announces that
              //   wait on stderr by contract (`withRepoMutex.integration` [case2] pins the
              //   line). here the line is noise, so it is kept out of the test log; the mutex,
              //   the peer hold, the peer's write and the derivation are all real
              // .real = everything but that one stderr write
              const errSpy = jest
                .spyOn(process.stderr, 'write')
                .mockImplementation(() => true);

              try {
                const derived = genBrainCliConfigArtifact({
                  enrollment: new BrainCliEnrollmentManifest({
                    brain: 'claude',
                    roles: ['mechanic'],
                  }),
                  exid: REPO_EXID,
                  repoPath,
                });

                // the peer writes its hook, then releases; the derivation must not have run yet
                await new Promise<void>((done) => setTimeout(done, 300));
                const midway = JSON.parse(
                  await fs.readFile(settingsPath, 'utf-8'),
                ) as ClaudeCodeSettings;
                expect(midway.claudeMdExcludes).toBeUndefined();
                await fs.writeFile(
                  settingsPath,
                  JSON.stringify({
                    hooks: {
                      SessionStart: [
                        {
                          matcher: '*',
                          hooks: [
                            {
                              type: 'command',
                              command: 'echo peer boot',
                              author: 'repo=ehmpathy/role=mechanic',
                            },
                          ],
                        },
                      ],
                    },
                  }),
                );
                gate.emit('release');
                await peer;
                await derived;
              } finally {
                errSpy.mockRestore();
              }

              const final = JSON.parse(
                await fs.readFile(settingsPath, 'utf-8'),
              ) as ClaudeCodeSettings;
              expect(JSON.stringify(final.hooks)).toContain('echo peer boot');
              expect(Array.isArray(final.claudeMdExcludes)).toEqual(true);
            },
          );
        },
      );
    },
  );

  given('[case7] repo settings whose env map resets the clone depth', () => {
    // 🔴 claude hands a settings `env` map to every tool shell. were the reset copied
    //   into the artifact, a depth-1 clone's shell would read depth 0 and spawn again
    const scene = useBeforeAll(async () => {
      const repoPath = await createTestRepo({
        env: { RHACHET_CLONE_DEPTH: '0', DEBUG: 'surf:*' },
      });
      return { repoPath };
    });

    when('[t0] enroll with mechanic role', () => {
      const result = useBeforeAll(async () =>
        genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic'],
          }),
          exid: HASH_EXID,
          repoPath: scene.repoPath,
        }),
      );

      then(
        'the artifact carries no depth key, and keeps the foreign key',
        async () => {
          const content = await fs.readFile(result.configPath, 'utf-8');
          const settings = JSON.parse(content) as ClaudeCodeSettings;
          expect(settings.env).toEqual({ DEBUG: 'surf:*' });
        },
      );
    });
  });

  given('[case8] a fresh hash actor, rendered as a clone spawn', () => {
    // 🔴 a clone boots the file its `--settings` names; an empty attribution there mutes the trailer
    const scene = useBeforeAll(async () => {
      const repoPath = await createTestRepo({
        permissions: { allow: ['Bash(npm run build)'] },
      });
      return { repoPath };
    });

    when('[t0] the clone spawn is rendered', () => {
      const spawn = useBeforeAll(async () => {
        const { configPath } = await genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic'],
          }),
          exid: HASH_EXID,
          repoPath: scene.repoPath,
        });
        const args = asBrainCliSpawnArgs({
          configPath,
          bootMdPath: path.join(
            asBrainDir({ repoPath: scene.repoPath, exid: HASH_EXID }),
            'boot.md',
          ),
          passthrough: [],
        });
        const settingsPath = args[args.indexOf('--settings') + 1]!;
        const settings = JSON.parse(
          await fs.readFile(settingsPath, 'utf-8'),
        ) as ClaudeCodeSettings;
        return { settingsPath, settings };
      });

      then('the --settings file sits in the actor brain dir', () => {
        expect(path.dirname(spawn.settingsPath)).toEqual(
          asBrainDir({ repoPath: scene.repoPath, exid: HASH_EXID }),
        );
      });

      then('attribution is off for commits and pull requests', () => {
        expect(spawn.settings.attribution).toEqual({ commit: '', pr: '' });
      });
    });
  });

  given('[case9] extant actor settings with keys beside attribution', () => {
    const settingsSource: ClaudeCodeSettings = {
      permissions: { allow: ['Bash(npm run build)'] },
      env: { DEBUG: 'surf:*' },
      model: 'haiku',
      hooks: {
        SessionStart: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: 'echo mechanic boot',
                author: 'repo=ehmpathy/role=mechanic',
              },
            ],
          },
        ],
      },
      attribution: {
        commit: 'Co-Authored-By: Claude <noreply@anthropic.com>',
        sessionUrl: false,
      },
    };

    when('[t0] the repo actor is enrolled', () => {
      // the repo actor's file is the source itself, so this when owns its own repo
      const scene = useBeforeAll(async () => {
        const repoPath = await createTestRepo(settingsSource);
        return { repoPath };
      });

      const result = useBeforeAll(async () => {
        const { configPath } = await genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic'],
          }),
          exid: REPO_EXID,
          repoPath: scene.repoPath,
        });
        const bytes = await fs.readFile(configPath, 'utf-8');
        return { configPath, bytes };
      });

      then('every key but attribution and the excludes is kept as-is', () => {
        const {
          attribution: _attribution,
          claudeMdExcludes: _excludes,
          ...settingsRest
        } = JSON.parse(result.bytes) as ClaudeCodeSettings;
        const { attribution: _attributionPrior, ...sourceRest } =
          settingsSource;
        expect(settingsRest).toEqual(sourceRest);
      });

      then('commit and pr go empty; a subkey a human set is kept', () => {
        const settings = JSON.parse(result.bytes) as ClaudeCodeSettings;
        expect(settings.attribution).toEqual({
          commit: '',
          pr: '',
          sessionUrl: false,
        });
      });

      then('a second enroll leaves the file byte-identical', async () => {
        await genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic'],
          }),
          exid: REPO_EXID,
          repoPath: scene.repoPath,
        });
        expect(await fs.readFile(result.configPath, 'utf-8')).toEqual(
          result.bytes,
        );
      });
    });

    when('[t1] a hash actor is enrolled from that source', () => {
      // a fresh repo, so the hash actor derives from the custom text, not from [t0]'s rewrite
      const scene = useBeforeAll(async () => {
        const repoPath = await createTestRepo(settingsSource);
        return { repoPath };
      });

      const result = useBeforeAll(async () => {
        const { configPath } = await genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic'],
          }),
          exid: HASH_EXID,
          repoPath: scene.repoPath,
        });
        const bytes = await fs.readFile(configPath, 'utf-8');
        const source = JSON.parse(
          await fs.readFile(
            path.join(
              asBrainDir({ repoPath: scene.repoPath, exid: REPO_EXID }),
              'settings.of.repo.json',
            ),
            'utf-8',
          ),
        ) as ClaudeCodeSettings;
        return { bytes, source };
      });

      then('the source keeps its custom text; the derive sets it off', () => {
        expect(result.source.attribution).toEqual(settingsSource.attribution);
      });

      then('the derived keys hold their values; attribution is off', () => {
        const settings = JSON.parse(result.bytes) as ClaudeCodeSettings;
        expect(settings.permissions).toEqual(settingsSource.permissions);
        expect(settings.env).toEqual(settingsSource.env);
        expect(settings.model).toEqual('haiku');
        expect(settings.hooks).toEqual(settingsSource.hooks);
        expect(settings.attribution).toEqual({
          commit: '',
          pr: '',
          sessionUrl: false,
        });
      });
    });
  });

  given('[case10] a tracked repo-actor file from before the upgrade', () => {
    // 🔴 the repo actor's file is tracked: its first enroll after the upgrade must add the
    //   attribution key and move no other key, so the git diff holds that key alone
    const scene = useBeforeAll(async () => {
      const repoPath = await createTestRepo({
        permissions: { allow: ['Bash(npm run build)'] },
        env: { DEBUG: 'surf:*' },
        hooks: {
          SessionStart: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: 'echo mechanic boot',
                  author: 'repo=ehmpathy/role=mechanic',
                },
              ],
            },
          ],
        },
      });
      const configPath = path.join(
        asBrainDir({ repoPath, exid: REPO_EXID }),
        'settings.of.repo.json',
      );

      // the pre-upgrade file: what an enroll wrote before, so its excludes are in place
      await genBrainCliConfigArtifact({
        enrollment: new BrainCliEnrollmentManifest({
          brain: 'claude',
          roles: ['mechanic'],
        }),
        exid: REPO_EXID,
        repoPath,
      });
      const { attribution: _attribution, ...settingsPrior } = JSON.parse(
        await fs.readFile(configPath, 'utf-8'),
      ) as ClaudeCodeSettings;
      await fs.writeFile(configPath, JSON.stringify(settingsPrior, null, 2));
      return { repoPath, configPath, settingsPrior };
    });

    when('[t0] the repo actor is enrolled', () => {
      const result = useBeforeAll(async () => {
        await genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic'],
          }),
          exid: REPO_EXID,
          repoPath: scene.repoPath,
        });
        return {
          settings: JSON.parse(
            await fs.readFile(scene.configPath, 'utf-8'),
          ) as ClaudeCodeSettings,
        };
      });

      then(
        'the prior keys keep their order; attribution is the one key added',
        () => {
          expect(Object.keys(result.settings)).toEqual([
            ...Object.keys(scene.settingsPrior),
            'attribution',
          ]);
        },
      );

      then('every prior key keeps its value, the excludes included', () => {
        const { attribution: _attribution, ...settingsRest } = result.settings;
        expect(settingsRest).toEqual(scene.settingsPrior);
        expect(scene.settingsPrior.claudeMdExcludes).toBeDefined();
      });

      then('attribution is off', () => {
        expect(result.settings.attribution).toEqual({ commit: '', pr: '' });
      });
    });
  });
});
