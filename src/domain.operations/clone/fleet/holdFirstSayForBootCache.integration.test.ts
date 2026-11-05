import { MalfunctionError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';
import { setCloneTranscriptRow } from '@src/.test/assets/setCloneTranscriptRow';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

import { existsSync, mkdirSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getOneCloneByRef } from '../getOneCloneByRef';
import {
  BOOT_CACHE_LEAD_UNANSWERED_MS,
  BOOT_CACHE_LEAD_UNSENT_MS,
} from './asBootCacheLeadDecision';
import { BOOT_CACHE_LEAD_PRUNE_MS } from './delBootCacheLeadsStale';
import { getBootCacheLeadPath } from './getBootCacheLeadPath';
import { getOneBootCacheLead } from './getOneBootCacheLead';
import { getOneBootHashOfActor } from './getOneBootHashOfActor';
import { holdFirstSayForBootCache } from './holdFirstSayForBootCache';
import { holdFirstSayForBootCacheOrUnheld } from './holdFirstSayForBootCacheOrUnheld';
import { setBootCacheLead } from './setBootCacheLead';

/**
 * .what = seed one clone of an actor whose brain dir holds a boot, in a repo
 * .note = `live` makes the clone DEAF (this process's pid, no socket), else DEAD
 */
const genCloneWithBoot = async (input: {
  repoPath: string;
  roles: string[];
  live: boolean;
  boot: string;
}) => {
  const seeded = await genSampleCloneOndisk({
    repoPath: input.repoPath,
    roles: input.roles,
    serial: getUuid(),
    slug: null,
    socketEligible: !input.live,
  });
  const brainDir = getBrainOndiskDir({ actorDir: seeded.actorDir });
  mkdirSync(brainDir, { recursive: true });
  writeFileSync(join(brainDir, 'boot.md'), input.boot);
  const clone = getOneCloneByRef({
    repoPath: seeded.repoPath,
    ref: { by: 'serial', serial: seeded.serial },
  });
  if (!clone)
    throw new MalfunctionError('the seeded clone was not found', {
      serial: seeded.serial,
      repoPath: seeded.repoPath,
      hint: 'check that genSampleCloneOndisk wrote the clone dir under this repo, and that its serial matches',
    });
  return { ...seeded, clone };
};

/**
 * .what = append the rows claude writes before any request, in the shape of a v2.1.280 transcript
 */
const setTranscriptRowsOfStartup = (input: { cloneDir: string }) => {
  const historyDir = join(input.cloneDir, 'history');
  mkdirSync(historyDir, { recursive: true });
  const rows = [
    { type: 'mode', mode: 'normal' },
    { type: 'permission-mode', permissionMode: 'default' },
    {
      type: 'attachment',
      attachment: { type: 'hook_success', hookEvent: 'SessionStart' },
    },
    { type: 'user', isMeta: true, message: { content: 'caveat' } },
  ];
  writeFileSync(
    join(historyDir, 'session.jsonl'),
    rows.map((row) => `${JSON.stringify(row)}\n`).join(''),
    { flag: 'a' },
  );
};

/**
 * .what = the lead record path of the boot an actor holds, keyed by the gate's own leaf
 */
const leadPathOf = (input: { repoPath: string; actorDir: string }) => {
  const bootHash = getOneBootHashOfActor({ actorDir: input.actorDir });
  if (!bootHash)
    throw new MalfunctionError('the seeded actor holds no boot.md', {
      actorDir: input.actorDir,
      hint: 'seed the clone via genCloneWithBoot',
    });
  return getBootCacheLeadPath({ repoPath: input.repoPath, bootHash });
};

describe('holdFirstSayForBootCacheOrUnheld', () => {
  given('[case1] a gate that faults on its lead record', () => {
    when('[t0] a first say is held', () => {
      then('it names the fault on stderr and lets the say go', async () => {
        const repoPath = genTempDir({ slug: 'boot-hold-fault' });
        const lone = await genCloneWithBoot({
          repoPath,
          roles: ['mechanic'],
          live: true,
          boot: 'boot f',
        });
        // a dir where the lead record belongs: the record read faults with EISDIR
        mkdirSync(
          leadPathOf({ repoPath: lone.repoPath, actorDir: lone.actorDir }),
          {
            recursive: true,
          },
        );

        const lines: string[] = [];
        await holdFirstSayForBootCacheOrUnheld(
          { repoPath: lone.repoPath, clone: lone.clone },
          { log: { error: (line) => lines.push(line) } },
        );

        expect(lines).toHaveLength(1);
        expect(lines[0]).toContain('the boot cache gate faulted');
        expect(lines[0]).toContain('EISDIR');
        expect(lines[0]).toContain('this say goes unheld');
      });
    });
  });

  given(
    '[case2] a gate that meets a defect, not a contention or i/o fault',
    () => {
      when('[t0] a first say is held', () => {
        then('it rethrows the defect and logs no line', async () => {
          const repoPath = genTempDir({ slug: 'boot-hold-defect' });
          const lone = await genCloneWithBoot({
            repoPath,
            roles: ['mechanic'],
            live: true,
            boot: 'boot d',
          });
          // .note = a clone with no actor is a shape the types forbid; the cast forges the defect
          //   on purpose, so the read inside the gate throws a TypeError
          const cloneBroken = {
            ...lone.clone,
            actor: null,
          } as unknown as typeof lone.clone;

          const lines: string[] = [];
          const error = await getError(
            holdFirstSayForBootCacheOrUnheld(
              { repoPath: lone.repoPath, clone: cloneBroken },
              { log: { error: (line) => lines.push(line) } },
            ),
          );

          expect(error).toBeInstanceOf(TypeError);
          expect(lines).toHaveLength(0);
        });
      });
    },
  );
});

describe('holdFirstSayForBootCache', () => {
  given('[case1] a lone clone of a boot no clone has sent', () => {
    when('[t0] its first say is held', () => {
      then('it claims the lead and goes at once', async () => {
        const repoPath = genTempDir({ slug: 'boot-hold-c1' });
        const lone = await genCloneWithBoot({
          repoPath,
          roles: ['mechanic'],
          live: true,
          boot: 'boot a',
        });

        const hold = await holdFirstSayForBootCache({
          repoPath: lone.repoPath,
          clone: lone.clone,
        });

        expect(hold).toEqual({
          outcome: 'lead',
          heldMs: 0,
          leadSerial: lone.serial,
        });
        expect(
          getOneBootCacheLead({
            path: leadPathOf({
              repoPath: lone.repoPath,
              actorDir: lone.actorDir,
            }),
          })?.serial,
        ).toEqual(lone.serial);
      });
    });
  });

  given(
    '[case2] two clones of one boot; the lead has sent its first request',
    () => {
      when(
        '[t0] the second clone says first while the lead has not answered',
        () => {
          then('it waits until the lead answers, then goes', async () => {
            const repoPath = genTempDir({ slug: 'boot-hold-c2' });
            const lead = await genCloneWithBoot({
              repoPath,
              roles: ['mechanic'],
              live: true,
              boot: 'boot b',
            });
            const follower = await genCloneWithBoot({
              repoPath,
              roles: ['mechanic'],
              live: true,
              boot: 'boot b',
            });
            expect(follower.actorDir).toEqual(lead.actorDir);

            // the lead's first say claims; its request is in flight, no answer yet
            await holdFirstSayForBootCache({
              repoPath: lead.repoPath,
              clone: lead.clone,
            });
            setCloneTranscriptRow({ cloneDir: lead.cloneDir, type: 'user' });
            setTimeout(
              () =>
                setCloneTranscriptRow({
                  cloneDir: lead.cloneDir,
                  type: 'assistant',
                }),
              600,
            );

            // the begin signal fires as the wait starts, never after it ends
            const begunAt: {
              atMs: number;
              leadSerial: string;
              leadStarted: boolean;
              boundMs: number;
            }[] = [];
            const startedAtMs = Date.now();
            const hold = await holdFirstSayForBootCache(
              { repoPath: follower.repoPath, clone: follower.clone },
              {
                pollMs: 50,
                onHoldBegin: (begun) =>
                  begunAt.push({ atMs: Date.now(), ...begun }),
              },
            );

            expect(hold.outcome).toEqual('released');
            expect(hold.leadSerial).toEqual(lead.serial);
            expect(hold.heldMs).toBeGreaterThanOrEqual(400);
            expect(begunAt).toHaveLength(1);
            expect(begunAt[0]!.leadSerial).toEqual(lead.serial);
            expect(begunAt[0]!.atMs - startedAtMs).toBeLessThan(300);

            // the begin names the state the gate saw and the bound it holds now: the lead sent,
            //   so the long bound, less the time since its claim
            expect(begunAt[0]!.leadStarted).toEqual(true);
            expect(begunAt[0]!.boundMs).toBeGreaterThan(
              BOOT_CACHE_LEAD_UNSENT_MS,
            );
            expect(begunAt[0]!.boundMs).toBeLessThanOrEqual(
              BOOT_CACHE_LEAD_UNANSWERED_MS,
            );
          });
        },
      );

      when(
        '[t1] the second clone says first after the lead has answered',
        () => {
          then('the boot is warm, so it goes at once', async () => {
            const repoPath = genTempDir({ slug: 'boot-hold-c2t1' });
            const lead = await genCloneWithBoot({
              repoPath,
              roles: ['mechanic'],
              live: true,
              boot: 'boot c',
            });
            const follower = await genCloneWithBoot({
              repoPath,
              roles: ['mechanic'],
              live: true,
              boot: 'boot c',
            });
            await holdFirstSayForBootCache({
              repoPath: lead.repoPath,
              clone: lead.clone,
            });
            setCloneTranscriptRow({ cloneDir: lead.cloneDir, type: 'user' });
            setCloneTranscriptRow({
              cloneDir: lead.cloneDir,
              type: 'assistant',
            });

            const hold = await holdFirstSayForBootCache({
              repoPath: follower.repoPath,
              clone: follower.clone,
            });

            expect(hold).toEqual({
              outcome: 'warm',
              heldMs: 0,
              leadSerial: lead.serial,
            });
          });
        },
      );
    },
  );

  given('[case3] a lead that died before it answered', () => {
    when('[t0] a second clone of its boot says first', () => {
      then('it claims the lead at once, never waits on the dead', async () => {
        const repoPath = genTempDir({ slug: 'boot-hold-c3' });
        const lead = await genCloneWithBoot({
          repoPath,
          roles: ['mechanic'],
          live: false,
          boot: 'boot d',
        });
        const follower = await genCloneWithBoot({
          repoPath,
          roles: ['mechanic'],
          live: true,
          boot: 'boot d',
        });
        setBootCacheLead({
          path: leadPathOf({
            repoPath: lead.repoPath,
            actorDir: lead.actorDir,
          }),
          lead: { serial: lead.serial, claimedAtMs: Date.now() },
        });

        const hold = await holdFirstSayForBootCache({
          repoPath: follower.repoPath,
          clone: follower.clone,
        });

        expect(hold).toEqual({
          outcome: 'lead',
          heldMs: 0,
          leadSerial: follower.serial,
        });
      });
    });
  });

  given('[case4] a live lead that never answers', () => {
    when('[t0] a second clone says first near the bound', () => {
      then('it waits only to the bound, then goes', async () => {
        const repoPath = genTempDir({ slug: 'boot-hold-c4' });
        const lead = await genCloneWithBoot({
          repoPath,
          roles: ['mechanic'],
          live: true,
          boot: 'boot e',
        });
        const follower = await genCloneWithBoot({
          repoPath,
          roles: ['mechanic'],
          live: true,
          boot: 'boot e',
        });
        setBootCacheLead({
          path: leadPathOf({
            repoPath: lead.repoPath,
            actorDir: lead.actorDir,
          }),
          lead: {
            serial: lead.serial,
            claimedAtMs: Date.now() - BOOT_CACHE_LEAD_UNANSWERED_MS + 500,
          },
        });
        setCloneTranscriptRow({ cloneDir: lead.cloneDir, type: 'user' });

        const hold = await holdFirstSayForBootCache(
          { repoPath: follower.repoPath, clone: follower.clone },
          { pollMs: 50, onHoldBegin: () => undefined },
        );

        expect(hold.outcome).toEqual('bound');
        expect(hold.heldMs).toBeLessThan(2_000);
      });
    });
  });

  given('[case8] a live lead that claimed and has not sent', () => {
    when('[t0] a second clone says first', () => {
      then(
        'the begin names the short bound and no send, then it goes at that bound',
        async () => {
          const repoPath = genTempDir({ slug: 'boot-hold-c8' });
          const lead = await genCloneWithBoot({
            repoPath,
            roles: ['mechanic'],
            live: true,
            boot: 'boot j',
          });
          const follower = await genCloneWithBoot({
            repoPath,
            roles: ['mechanic'],
            live: true,
            boot: 'boot j',
          });
          setBootCacheLead({
            path: leadPathOf({
              repoPath: lead.repoPath,
              actorDir: lead.actorDir,
            }),
            lead: {
              serial: lead.serial,
              claimedAtMs: Date.now() - BOOT_CACHE_LEAD_UNSENT_MS + 500,
            },
          });

          const begun: { leadStarted: boolean; boundMs: number }[] = [];
          const hold = await holdFirstSayForBootCache(
            { repoPath: follower.repoPath, clone: follower.clone },
            {
              pollMs: 50,
              onHoldBegin: ({ leadStarted, boundMs }) =>
                begun.push({ leadStarted, boundMs }),
            },
          );

          expect(begun).toHaveLength(1);
          expect(begun[0]!.leadStarted).toEqual(false);
          expect(begun[0]!.boundMs).toBeLessThanOrEqual(500);
          expect(hold.outcome).toEqual('bound');
          expect(hold.heldMs).toBeLessThan(2_000);
        },
      );
    });
  });

  given('[case7] a live lead whose say never submitted', () => {
    when('[t0] a second clone says first after the lead sent naught', () => {
      then(
        'it claims at once, never waits on a lead that writes no boot',
        async () => {
          const repoPath = genTempDir({ slug: 'boot-hold-c7' });
          const lead = await genCloneWithBoot({
            repoPath,
            roles: ['mechanic'],
            live: true,
            boot: 'boot i',
          });
          const follower = await genCloneWithBoot({
            repoPath,
            roles: ['mechanic'],
            live: true,
            boot: 'boot i',
          });
          setBootCacheLead({
            path: leadPathOf({
              repoPath: lead.repoPath,
              actorDir: lead.actorDir,
            }),
            lead: {
              serial: lead.serial,
              claimedAtMs: Date.now() - BOOT_CACHE_LEAD_UNSENT_MS - 1_000,
            },
          });

          const hold = await holdFirstSayForBootCache({
            repoPath: follower.repoPath,
            clone: follower.clone,
          });

          expect(hold).toEqual({
            outcome: 'lead',
            heldMs: 0,
            leadSerial: follower.serial,
          });
        },
      );
    });
  });

  given('[case5] a clone that has sent a request already', () => {
    when('[t0] it is said to again', () => {
      then(
        'it goes at once, for only a first request writes the boot',
        async () => {
          const repoPath = genTempDir({ slug: 'boot-hold-c5' });
          const clone = await genCloneWithBoot({
            repoPath,
            roles: ['mechanic'],
            live: true,
            boot: 'boot f',
          });
          setCloneTranscriptRow({ cloneDir: clone.cloneDir, type: 'user' });

          const hold = await holdFirstSayForBootCache({
            repoPath: clone.repoPath,
            clone: clone.clone,
          });

          expect(hold).toEqual({
            outcome: 'later-say',
            heldMs: 0,
            leadSerial: null,
          });
        },
      );
    });
  });

  given('[case6] two clones of two different boots', () => {
    when('[t0] each says first while the other has not answered', () => {
      then('neither waits on the other', async () => {
        const repoPath = genTempDir({ slug: 'boot-hold-c6' });
        const first = await genCloneWithBoot({
          repoPath,
          roles: ['mechanic'],
          live: true,
          boot: 'boot g',
        });
        const second = await genCloneWithBoot({
          repoPath,
          roles: ['architect'],
          live: true,
          boot: 'boot h',
        });
        await holdFirstSayForBootCache({
          repoPath: first.repoPath,
          clone: first.clone,
        });
        setCloneTranscriptRow({ cloneDir: first.cloneDir, type: 'user' });

        const hold = await holdFirstSayForBootCache({
          repoPath: second.repoPath,
          clone: second.clone,
        });

        expect(hold).toEqual({
          outcome: 'lead',
          heldMs: 0,
          leadSerial: second.serial,
        });
      });
    });
  });

  given('[case10] a live lead that sends while a follower is held', () => {
    // 🔴 the main path of a fleet said to in one breath: the follower meets a claim not yet sent,
    //   so its first bound is the short one; the bound must grow once the lead sends, or the
    //   follower goes at the short bound and writes the boot itself
    when('[t0] the lead sends, then answers, past the short bound', () => {
      then(
        'the follower is held past the short bound until the answer',
        async () => {
          const repoPath = genTempDir({ slug: 'boot-hold-c10' });
          const lead = await genCloneWithBoot({
            repoPath,
            roles: ['mechanic'],
            live: true,
            boot: 'boot m',
          });
          const follower = await genCloneWithBoot({
            repoPath,
            roles: ['mechanic'],
            live: true,
            boot: 'boot m',
          });
          // the short bound ends 1s from now
          setBootCacheLead({
            path: leadPathOf({
              repoPath: lead.repoPath,
              actorDir: lead.actorDir,
            }),
            lead: {
              serial: lead.serial,
              claimedAtMs: Date.now() - BOOT_CACHE_LEAD_UNSENT_MS + 1_000,
            },
          });

          // the lead sends at 300ms and answers at 1.8s, mid-hold
          const sent = new Promise((done) => setTimeout(done, 300)).then(() =>
            setCloneTranscriptRow({ cloneDir: lead.cloneDir, type: 'user' }),
          );
          const answered = new Promise((done) => setTimeout(done, 1_800)).then(
            () =>
              setCloneTranscriptRow({
                cloneDir: lead.cloneDir,
                type: 'assistant',
              }),
          );
          const hold = await holdFirstSayForBootCache(
            { repoPath: follower.repoPath, clone: follower.clone },
            { pollMs: 50, onHoldBegin: () => undefined },
          );
          await Promise.all([sent, answered]);

          expect(hold.outcome).toEqual('released');
          expect(hold.heldMs).toBeGreaterThan(1_000);
        },
      );
    });
  });

  given(
    '[case9] a clone whose transcript holds only the rows claude writes at startup',
    () => {
      // 🔴 claude writes mode, permission, and SessionStart hook rows before any request; read
      //   as "started", every fresh clone would skip the gate and the fleet would pay N writes
      when('[t0] its first say is held', () => {
        then('it is a first say: it claims the lead', async () => {
          const repoPath = genTempDir({ slug: 'boot-hold-c9' });
          const clone = await genCloneWithBoot({
            repoPath,
            roles: ['mechanic'],
            live: true,
            boot: 'boot s',
          });
          setTranscriptRowsOfStartup({ cloneDir: clone.cloneDir });

          const hold = await holdFirstSayForBootCache({
            repoPath: clone.repoPath,
            clone: clone.clone,
          });

          expect(hold).toEqual({
            outcome: 'lead',
            heldMs: 0,
            leadSerial: clone.serial,
          });
        });
      });
    },
  );

  given(
    '[case12] a lone clone, beside a stale lead record of a boot long gone',
    () => {
      when('[t0] its first say is held', () => {
        then('it claims the lead, and the stale record is pruned', async () => {
          const repoPath = genTempDir({ slug: 'boot-hold-c12' });
          const lone = await genCloneWithBoot({
            repoPath,
            roles: ['mechanic'],
            live: true,
            boot: 'boot p',
          });
          const pathStale = getBootCacheLeadPath({
            repoPath: lone.repoPath,
            bootHash: '0000000000000000',
          });
          mkdirSync(join(pathStale, '..'), { recursive: true });
          writeFileSync(
            pathStale,
            `${JSON.stringify({ serial: 'gone', claimedAtMs: 0 })}\n`,
          );
          const atSeconds =
            (Date.now() - BOOT_CACHE_LEAD_PRUNE_MS - 60_000) / 1000;
          utimesSync(pathStale, atSeconds, atSeconds);

          const hold = await holdFirstSayForBootCache({
            repoPath: lone.repoPath,
            clone: lone.clone,
          });

          expect(hold.outcome).toEqual('lead');
          expect(existsSync(pathStale)).toEqual(false);
          expect(
            existsSync(
              leadPathOf({ repoPath: lone.repoPath, actorDir: lone.actorDir }),
            ),
          ).toEqual(true);
        });
      });
    },
  );

  given('[case11] a clone whose actor brain dir holds no boot.md', () => {
    when('[t0] its first say is held', () => {
      then('it goes at once, and claims no lead record', async () => {
        const repoPath = genTempDir({ slug: 'boot-hold-c11' });
        const seeded = await genSampleCloneOndisk({
          repoPath,
          roles: ['mechanic'],
          serial: getUuid(),
          slug: null,
          socketEligible: false,
        });
        const clone = getOneCloneByRef({
          repoPath: seeded.repoPath,
          ref: { by: 'serial', serial: seeded.serial },
        });
        if (!clone)
          throw new MalfunctionError('the seeded clone was not found', {
            serial: seeded.serial,
            hint: 'check that genSampleCloneOndisk wrote the clone dir under this repo',
          });

        // the premise: no boot.md, so there is no content to key a lead on
        expect(
          existsSync(
            join(getBrainOndiskDir({ actorDir: seeded.actorDir }), 'boot.md'),
          ),
        ).toEqual(false);

        const hold = await holdFirstSayForBootCache({
          repoPath: seeded.repoPath,
          clone,
        });

        expect(hold).toEqual({
          outcome: 'no-boot',
          heldMs: 0,
          leadSerial: null,
        });
        expect(
          existsSync(join(seeded.repoPath, '.agent', '.actors', '.boot.leads')),
        ).toEqual(false);
      });
    });
  });

  given('[case13] a peer holds the lead record mutex of this boot', () => {
    when('[t0] a lone clone says first while the peer holds it', () => {
      then(
        'it claims only once the peer lets go: the claim sits inside the mutex',
        async () => {
          // the race guard is the mutex: two first says never both claim. the mutex's own
          //   cross-process exclusion is proven in `withRepoMutex.integration.test.ts`; this
          //   proves the gate's read and claim sit inside it, so a claim moved out of the lock reds
          const repoPath = genTempDir({ slug: 'boot-hold-c13' });
          const lone = await genCloneWithBoot({
            repoPath,
            roles: ['mechanic'],
            live: true,
            boot: 'boot c13',
          });
          const leadPath = leadPathOf({
            repoPath: lone.repoPath,
            actorDir: lone.actorDir,
          });
          mkdirSync(dirname(leadPath), { recursive: true });

          // the peer takes the mutex first, and holds it for 1.5s
          const peerHeld = { released: false };
          const peer = withRepoMutex(
            { repoPath: lone.repoPath, path: leadPath, waitMs: 10_000 },
            async () => {
              await new Promise((done) => setTimeout(done, 1_500));
              peerHeld.released = true;
            },
          );
          await new Promise((done) => setTimeout(done, 100));

          const hold = holdFirstSayForBootCache({
            repoPath: lone.repoPath,
            clone: lone.clone,
          });

          // while the peer holds the mutex, the gate has not claimed
          await new Promise((done) => setTimeout(done, 700));
          expect(peerHeld.released).toEqual(false);
          expect(getOneBootCacheLead({ path: leadPath })).toEqual(null);

          // once the peer lets go, the gate claims
          await peer;
          expect(await hold).toEqual({
            outcome: 'lead',
            heldMs: 0,
            leadSerial: lone.serial,
          });
          expect(getOneBootCacheLead({ path: leadPath })?.serial).toEqual(
            lone.serial,
          );
        },
      );
    });
  });
});
