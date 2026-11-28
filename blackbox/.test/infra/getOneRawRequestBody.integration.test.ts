import { MalfunctionError } from 'helpful-errors';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genTempDir, getError, given, then, useThen, when } from 'test-fns';

import { getOneRawRequestBody } from './getOneRawRequestBody';

const OPENER = {
  system: [{ type: 'text', text: 'the boot' }],
  tools: [{ name: 'Read' }],
  messages: [{ role: 'user', content: 'the opener' }],
};

describe('getOneRawRequestBody', () => {
  given('[case1] a dir with two logged requests, the opener listed first', () => {
    const dir = genTempDir({ slug: 'raw-request-body' });

    // the opener's file name sorts AFTER the later request's, so only the index can pick it
    writeFileSync(join(dir, 'f0000000.request.json'), JSON.stringify(OPENER));
    writeFileSync(
      join(dir, '00000000.request.json'),
      JSON.stringify({
        system: [{ type: 'text', text: 'a later call' }],
        tools: [],
        messages: [{ role: 'user', content: 'later' }],
      }),
    );
    writeFileSync(
      join(dir, 'index.jsonl'),
      [
        JSON.stringify({ request_file: 'f0000000.request.json' }),
        JSON.stringify({ request_file: '00000000.request.json' }),
        '',
      ].join('\n'),
    );

    when('[t0] the body is read', () => {
      const body = useThen('it reads', async () => getOneRawRequestBody({ dir }));

      then('it is the opener, by send order, never by file name', () => {
        expect(body.system).toContain('the boot');
        expect(body.messageFirst).toContain('the opener');
      });

      then('each block is the json the cache compares', () => {
        expect(body.system).toEqual(JSON.stringify(OPENER.system));
        expect(body.tools).toEqual(JSON.stringify(OPENER.tools));
      });
    });
  });

  given('[case2] a dir with an empty index', () => {
    const dir = genTempDir({ slug: 'raw-request-body-empty' });
    writeFileSync(join(dir, 'index.jsonl'), '');

    when('[t0] the body is read', () => {
      then('it fails loud at the bound, and names the env var that cures it', async () => {
        const error = await getError(getOneRawRequestBody({ dir, timeoutMs: 300 }));
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('no raw request body was logged');
        expect(error.message).toContain('OTEL_LOG_RAW_API_BODIES');
        expect(error.message).toContain('the index lists no request yet');
      });
    });
  });

  given('[case3] a body the brain-cli flushes after the read begins', () => {
    const dir = genTempDir({ slug: 'raw-request-body-late' });

    when('[t0] the body is read while the files are still absent', () => {
      then('the poll waits for them and returns the opener', async () => {
        // the files land 300ms after the read begins, as an exit-time flush would
        const bodyPromise = getOneRawRequestBody({ dir, timeoutMs: 5_000 });
        setTimeout(() => {
          writeFileSync(join(dir, 'a.request.json'), JSON.stringify(OPENER));
          writeFileSync(
            join(dir, 'index.jsonl'),
            `${JSON.stringify({ request_file: 'a.request.json' })}\n`,
          );
        }, 300);

        const body = await bodyPromise;
        expect(body.messageFirst).toContain('the opener');
      });
    });
  });

  given('[case4] a body cut off mid-write', () => {
    const dir = genTempDir({ slug: 'raw-request-body-partial' });
    writeFileSync(join(dir, 'a.request.json'), '{"system":[{"type":"te');
    writeFileSync(
      join(dir, 'index.jsonl'),
      `${JSON.stringify({ request_file: 'a.request.json' })}\n`,
    );

    when('[t0] the body is read and never completes', () => {
      then('it fails as a named malfunction that carries the parse cause', async () => {
        const error = await getError(getOneRawRequestBody({ dir, timeoutMs: 300 }));
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('no raw request body was logged');
        expect(error.message).toContain('JSON');
      });
    });
  });

  given('[case5] an index row that names no request file', () => {
    const dir = genTempDir({ slug: 'raw-request-body-nofile' });
    writeFileSync(join(dir, 'index.jsonl'), `${JSON.stringify({ other: 1 })}\n`);

    when('[t0] the body is read', () => {
      then('it fails as a named malfunction that names the absent field', async () => {
        const error = await getError(getOneRawRequestBody({ dir, timeoutMs: 300 }));
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('names no request_file');
      });
    });
  });

  given('[case6] a side request with no boot, then two requests that carry it', () => {
    // a brain cli opens with a side request (a session title) whose system block is its own
    const dir = genTempDir({ slug: 'raw-request-body-side' });
    const asBody = (input: { system: string; message: string }) =>
      JSON.stringify({
        system: [{ type: 'text', text: input.system }],
        tools: [],
        messages: [{ role: 'user', content: input.message }],
      });
    writeFileSync(join(dir, 'side.request.json'), asBody({ system: 'title this session', message: 'side' }));
    writeFileSync(join(dir, 'one.request.json'), asBody({ system: 'the boot', message: 'turn one' }));
    writeFileSync(join(dir, 'two.request.json'), asBody({ system: 'the boot', message: 'turn two' }));
    writeFileSync(
      join(dir, 'index.jsonl'),
      ['side', 'one', 'two']
        .map((name) => JSON.stringify({ request_file: `${name}.request.json` }))
        .join('\n'),
    );

    when('[t0] the body is read with systemHolds', () => {
      then('the first kept request is the first that carries the boot, never the side one', async () => {
        const body = await getOneRawRequestBody({ dir, systemHolds: 'the boot' });
        expect(body.messageFirst).toContain('turn one');
      });

      then('which last reads the latest request that carries the boot', async () => {
        const body = await getOneRawRequestBody({ dir, systemHolds: 'the boot', which: 'last' });
        expect(body.messageFirst).toContain('turn two');
      });
    });

    when('[t1] no request carries the text', () => {
      then('it fails as a named malfunction that names the text it sought', async () => {
        const error = await getError(
          getOneRawRequestBody({ dir, systemHolds: 'absent text', timeoutMs: 300 }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('holds absent text');
      });
    });
  });
});
