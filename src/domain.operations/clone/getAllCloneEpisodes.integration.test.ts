import { genTempDir, given, then, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllCloneEpisodes } from './getAllCloneEpisodes';

describe('getAllCloneEpisodes.integration', () => {
  given('[case1] a history dir with two linked episodes', () => {
    when('[t0] the episodes are read', () => {
      then('each episode yields its exid + content, no unreadable', () => {
        const root = genTempDir({ slug: 'episodesRead' });
        const cloneDir = join(root, 'clone');
        const transcriptsDir = join(root, 'transcripts');
        const historyDir = join(cloneDir, 'history');
        mkdirSync(transcriptsDir, { recursive: true });
        mkdirSync(historyDir, { recursive: true });

        const exidA = getUuid();
        const exidB = getUuid();
        for (const [exid, body] of [
          [exidA, 'aaa'],
          [exidB, 'bbb'],
        ] as const) {
          const transcriptPath = join(transcriptsDir, `${exid}.jsonl`);
          writeFileSync(transcriptPath, body, 'utf8');
          symlinkSync(transcriptPath, join(historyDir, `${exid}.jsonl`));
        }

        const out = getAllCloneEpisodes({ cloneDir });
        expect(out.exidsUnreadable).toEqual([]);
        expect(out.episodes.map((e) => e.exid).sort()).toEqual(
          [exidA, exidB].sort(),
        );
        expect(out.episodes.find((e) => e.exid === exidA)?.content).toEqual(
          'aaa',
        );
      });
    });
  });

  given('[case2] a history symlink whose target has vanished (ENOENT)', () => {
    when('[t0] the episodes are read', () => {
      then('the vanished exid is reported, never hidden', () => {
        const root = genTempDir({ slug: 'episodesVanished' });
        const cloneDir = join(root, 'clone');
        const historyDir = join(cloneDir, 'history');
        mkdirSync(historyDir, { recursive: true });
        const exid = getUuid();
        symlinkSync(
          join(root, 'gone', `${exid}.jsonl`),
          join(historyDir, `${exid}.jsonl`),
        );

        const out = getAllCloneEpisodes({ cloneDir });
        expect(out.episodes).toEqual([]);
        expect(out.exidsUnreadable).toEqual([exid]);
      });
    });
  });

  given('[case3] no history dir at all', () => {
    when('[t0] the episodes are read', () => {
      then('an empty read comes back, never a throw', () => {
        const root = genTempDir({ slug: 'episodesAbsent' });
        const out = getAllCloneEpisodes({ cloneDir: join(root, 'clone') });
        expect(out.episodes).toEqual([]);
        expect(out.exidsUnreadable).toEqual([]);
      });
    });
  });
});
