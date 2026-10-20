import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { BrainCliEnrollmentManifest } from '@src/domain.objects/BrainCliEnrollmentManifest';
import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

import { EventEmitter, once } from 'node:events';
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
    const repoPath = path.join(
      os.tmpdir(),
      `test-repo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
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
      const repoPath = path.join(os.tmpdir(), `test-repo-empty-${Date.now()}`);
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
    //   into the artifact, a depth-1 reviewer's shell would read depth 0 and spawn again
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
});
