import { given, then, when } from 'test-fns';

import { SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS } from '@src/infra/socket/constants';

import {
  CLONE_AUTH_GATE_MARGIN_MS,
  CLONE_AUTH_GATE_TIMEOUT_MS,
  CLONE_PROBE_REPLY_DEFAULT_MS,
  CLONE_SAY_PROBE_REPLY_MS,
  CLONE_WEDGED_TIMEOUT_FLOOR_MS,
} from './constants';

/**
 * .what = the ladder of bounds a clone socket connection waits within, from the fastest probe up
 *   to the auth gate
 * .why = when the gate bound sat at or below the lookup it waits on, a slow `ss` lookup ended as
 *   a deny before it could settle: a same-user say refused as `auth-denied`
 *   (ehmpathy/rhachet#678). the integration clamp proves a 9s lookup passes; this pins the whole
 *   ladder, so a new or moved bound forces a deliberate choice of where it sits
 */
describe('clone socket auth bounds', () => {
  given('[case1] the bound ladder', () => {
    when('[t0] each bound is read', () => {
      then('each rung holds its value', () => {
        expect({
          sayProbeReply: CLONE_SAY_PROBE_REPLY_MS,
          probeReplyDefault: CLONE_PROBE_REPLY_DEFAULT_MS,
          sayWedgeFloor: CLONE_WEDGED_TIMEOUT_FLOOR_MS,
          peerCredLookup: SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS,
          authGateMargin: CLONE_AUTH_GATE_MARGIN_MS,
          authGate: CLONE_AUTH_GATE_TIMEOUT_MS,
        }).toEqual({
          sayProbeReply: 1_000,
          probeReplyDefault: 5_000,
          sayWedgeFloor: 30_000,
          peerCredLookup: 60_000,
          authGateMargin: 5_000,
          authGate: 65_000,
        });
      });

      then(
        'the rungs climb in order: probe < wedge floor < lookup < gate',
        () => {
          const ladder = [
            CLONE_SAY_PROBE_REPLY_MS,
            CLONE_PROBE_REPLY_DEFAULT_MS,
            CLONE_WEDGED_TIMEOUT_FLOOR_MS,
            SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS,
            CLONE_AUTH_GATE_TIMEOUT_MS,
          ];
          expect(ladder).toEqual([...ladder].sort((a, b) => a - b));
          expect(new Set(ladder).size).toEqual(ladder.length);
        },
      );
    });
  });
});
