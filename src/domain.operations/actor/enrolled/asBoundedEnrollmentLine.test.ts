import { MalfunctionError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';
import { getError, given, then, when } from 'test-fns';

import {
  asBoundedEnrollmentLine,
  type EnrollmentRolesLogEntry,
} from './asBoundedEnrollmentLine';

const genEntry = (reason: string | null): EnrollmentRolesLogEntry => ({
  schemaVersion: 1,
  at: asIsoTimeStamp('2026-08-07T00:00:00.000Z'),
  roles: ['mechanic'],
  delta: null,
  reason,
});

describe('asBoundedEnrollmentLine', () => {
  given('[case1] an entry that already fits the cap', () => {
    when('[t0] bounded with a generous cap', () => {
      const line = asBoundedEnrollmentLine({
        entry: genEntry('a short motive'),
        maxBytes: 4096,
      });

      then('the reason is passed through untouched', () => {
        expect(JSON.parse(line).reason).toEqual('a short motive');
      });

      then('the line is valid JSON within the cap', () => {
        expect(() => JSON.parse(line)).not.toThrow();
        expect(Buffer.byteLength(line, 'utf8') + 1).toBeLessThanOrEqual(4096);
      });
    });
  });

  given('[case2] a long reason that overflows a tiny cap', () => {
    const longReason = 'x'.repeat(500);

    when('[t0] bounded with a 200-byte cap', () => {
      const line = asBoundedEnrollmentLine({
        entry: genEntry(longReason),
        maxBytes: 200,
      });

      then('the line fits the cap (incl. the newline)', () => {
        expect(Buffer.byteLength(line, 'utf8') + 1).toBeLessThanOrEqual(200);
      });

      then('the output stays valid JSON — escapes never split', () => {
        expect(() => JSON.parse(line)).not.toThrow();
      });

      then(
        'the reason carries the elision marker that names dropped bytes',
        () => {
          expect(JSON.parse(line).reason).toMatch(/…\[\+\d+B elided\]$/);
        },
      );
    });
  });

  given('[case3] a multi-byte (emoji) reason cut mid-way', () => {
    // each 🐢 is 2 code units / 4 utf-8 bytes; a naive slice would split a surrogate pair
    const emojiReason = '🐢'.repeat(200);

    when('[t0] bounded with a small cap', () => {
      const line = asBoundedEnrollmentLine({
        entry: genEntry(emojiReason),
        maxBytes: 120,
      });

      then('the output is still valid JSON (no split rune)', () => {
        expect(() => JSON.parse(line)).not.toThrow();
      });

      then('the kept reason contains only whole turtles', () => {
        const kept = JSON.parse(line).reason.replace(/…\[\+\d+B elided\]$/, '');
        // every kept char is part of a whole 🐢 — no lone surrogate
        expect(kept).toEqual('🐢'.repeat(Array.from(kept).length));
      });
    });
  });

  given('[case4] a cap too small for even the fixed fields', () => {
    when('[t0] bounded with an impossibly tiny cap and no reason', () => {
      then('it fails loud with a MalfunctionError', async () => {
        const error = await getError(() =>
          asBoundedEnrollmentLine({ entry: genEntry(null), maxBytes: 10 }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
      });
    });
  });
});
