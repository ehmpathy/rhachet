import { given, then, when } from 'test-fns';

import { asBootCacheHoldNotice } from './asBootCacheHoldNotice';

const LEAD_SERIAL = '3f2a9c1b-7d4e-4a10-9b2c-5e6f7a8b9c0d';

describe('asBootCacheHoldNotice', () => {
  given('[case1] a hold that begins', () => {
    when('[t0] rendered, the lead has sent its first request', () => {
      then('it names the lead by its short address and the bound', () => {
        const line = asBootCacheHoldNotice({
          phase: 'begin',
          leadSerial: LEAD_SERIAL,
          leadStarted: true,
          boundMs: 44_700,
        });
        expect(line).toContain('@:3f2a9c1b');
        expect(line).not.toContain(LEAD_SERIAL);
        expect(line).toContain('up to 44.7s');
        expect(line).toContain('sent the first request of this boot');
        expect(line).toMatchSnapshot();
      });
    });

    when('[t1] rendered, the lead has not sent its first request', () => {
      then('it names the short bound and never claims a send', () => {
        const line = asBootCacheHoldNotice({
          phase: 'begin',
          leadSerial: LEAD_SERIAL,
          leadStarted: false,
          boundMs: 4_200,
        });
        expect(line).toContain('up to 4.2s');
        expect(line).toContain('has not sent it yet');
        expect(line).not.toContain(' sent the first request');
        expect(line).toMatchSnapshot();
      });
    });
  });

  given('[case2] a hold the lead released', () => {
    when('[t0] rendered', () => {
      then('it names the wait and that the boot reads from cache', () => {
        const line = asBootCacheHoldNotice({
          phase: 'released',
          leadSerial: LEAD_SERIAL,
          heldMs: 2_350,
        });
        expect(line).toContain('held 2.4s');
        expect(line).toContain('reads the boot from cache');
        expect(line).toMatchSnapshot();
      });
    });
  });

  given('[case3] a hold that reached its bound', () => {
    when('[t0] rendered', () => {
      then('it names that this clone writes the boot itself', () => {
        const line = asBootCacheHoldNotice({
          phase: 'bound',
          leadSerial: LEAD_SERIAL,
          heldMs: 45_000,
        });
        expect(line).toContain('has not replied');
        expect(line).toContain('writes the boot itself');
        expect(line).toMatchSnapshot();
      });
    });
  });

  given('[case4] a gate that faulted', () => {
    when('[t0] rendered', () => {
      then('it names the cause and that the say goes on', () => {
        const line = asBootCacheHoldNotice({
          phase: 'faulted',
          reason: 'mutex wait exceeded 10000ms',
        });
        expect(line).toContain('mutex wait exceeded 10000ms');
        expect(line).toContain('this say goes unheld');
        expect(line).toMatchSnapshot();
      });
    });
  });
});
