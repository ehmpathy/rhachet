import { given, then, when } from 'test-fns';

import {
  CLONE_OPERATIONAL_REJECT_COPY,
  type CloneOperationalRejectReason,
  computeCloneOperationalRejectClass,
  isCloneOperationalRejectReason,
} from './computeCloneOperationalRejectClass';

/**
 * .what = the four reasons a caller can fix in the request itself
 * .why = this is the ONLY half of the partition worth a hand-typed list: it is the half the
 *   module deliberately keeps small, and a slug added to it grants a caller-fault exit code,
 *   which is a decision that must be stated rather than inferred. the server-fault half is
 *   then DERIVED as the residual (below), so it cannot drift
 */
const CALLER_AMENDABLE: CloneOperationalRejectReason[] = [
  'frame-cap-exceeded',
  'not-valid-json',
  'not-a-say',
  'disallowed-control',
];

/**
 * .what = every reason the module declares, read off the copy record it owns
 * .why = the record is keyed by the closed-set type, so the compiler makes it the one
 *   enumeration that cannot fall behind the union
 */
const EVERY_REASON = Object.keys(
  CLONE_OPERATIONAL_REJECT_COPY,
) as CloneOperationalRejectReason[];

describe('computeCloneOperationalRejectClass', () => {
  given('a caller-amendable reason', () => {
    when('classified', () => {
      then('each is caller-amendable', () => {
        for (const reason of CALLER_AMENDABLE)
          expect(computeCloneOperationalRejectClass({ reason })).toEqual(
            'caller-amendable',
          );
      });
    });
  });

  given(
    'a server-fault reason — DERIVED from the closed set, never retyped',
    () => {
      // 🔴 this list was hand-typed and it DRIFTED. the closed set holds NINE server-fault
      //   reasons and the array stayed at five, so FOUR shipped with no classification clamp
      //   at all — `feed-faulted`, `auth-gate-timeout`, `auth-denied`, `server-fault`.
      // 🔴 and `feed-faulted` is this wish's OWN slug, so the drift is not a legacy artifact
      //   someone else left: the round that coined a member is the round that did not clamp it.
      //   that is the whole case for derivation over a retyped list — the author who adds a
      //   member is the least likely reader to recall a second file that enumerates it
      // .why it matters = each of the nine carries a MalfunctionError exit code (1). an
      //   unclassified one reports a server fault as a CALLER fault (exit 2) the moment it is
      //   added to the amendable half by mistake, and a caller told "your input was bad" about
      //   a dead brain-cli retries forever with a fix that cannot work
      // .the failure direction = a hand-kept copy of a closed set fails silently, always, and
      //   it fails toward UNDER-coverage — the half nobody notices
      // .why the residual = the module states the amendable half and defaults every other
      //   reason to server-fault. so the test states the same half and derives the same
      //   residual — one shape, one source, and a member added tomorrow is covered by
      //   construction rather than by whoever recalls this file
      const serverFault = EVERY_REASON.filter(
        (reason) => !CALLER_AMENDABLE.includes(reason),
      );

      when('classified', () => {
        then('each is server-fault', () => {
          for (const reason of serverFault)
            expect(computeCloneOperationalRejectClass({ reason })).toEqual(
              'server-fault',
            );
        });

        then(
          'the two halves COVER the closed set — no slug is unclassified',
          () => {
            expect(CALLER_AMENDABLE.length + serverFault.length).toEqual(
              EVERY_REASON.length,
            );
          },
        );

        then('the four the hand-typed list had missed are among them', () => {
          expect({
            feedFaulted: serverFault.includes('feed-faulted'),
            authGateTimeout: serverFault.includes('auth-gate-timeout'),
            authDenied: serverFault.includes('auth-denied'),
            serverFault: serverFault.includes('server-fault'),
          }).toEqual({
            feedFaulted: true,
            authGateTimeout: true,
            authDenied: true,
            serverFault: true,
          });
        });

        then(
          'the closed set is 4 caller-amendable + 9 server-fault = 13',
          () => {
            // the arithmetic stated, so a member added tomorrow trips a loud, readable diff
            // rather than a silent widening of the residual
            expect({
              callerAmendable: CALLER_AMENDABLE.length,
              serverFault: serverFault.length,
              total: EVERY_REASON.length,
            }).toEqual({ callerAmendable: 4, serverFault: 9, total: 13 });
          },
        );
      });
    },
  );

  given('the copy record', () => {
    when('read against the closed set', () => {
      then('every reason carries human copy — none ships a bare slug', () => {
        const withoutCopy = EVERY_REASON.filter(
          (reason) => !CLONE_OPERATIONAL_REJECT_COPY[reason]?.trim(),
        );
        expect(withoutCopy).toEqual([]);
      });

      then(
        'the residual slug names WHERE the cause is — the trace log, not just the class',
        () => {
          // the residual reports the CLASS rather than the cause, so its copy owes the reader
          // the one place the cause is written down (`rule.require.errors-name-the-fix`)
          expect(CLONE_OPERATIONAL_REJECT_COPY['server-fault']).toContain(
            'daemon.',
          );
        },
      );
    });
  });

  given('an unknown reason (a contract drift)', () => {
    when('classified', () => {
      then('it defaults to server-fault — the safe default fails loud', () => {
        expect(
          computeCloneOperationalRejectClass({ reason: 'some-new-slug' }),
        ).toEqual('server-fault');
      });
    });
  });

  given('the reason guard', () => {
    when('given a known slug', () => {
      then('it narrows true', () => {
        expect(isCloneOperationalRejectReason('no-live-brain-cli')).toEqual(
          true,
        );
      });

      then('it narrows true for EVERY member of the closed set', () => {
        // the derived sweep, for the same reason the classification is derived: a new slug
        // that the guard rejects would read as a reach fault rather than as its own reason,
        // so the guard and the copy record must never disagree about what exists
        const unrecognized = EVERY_REASON.filter(
          (reason) => !isCloneOperationalRejectReason(reason),
        );
        expect(unrecognized).toEqual([]);
      });
    });

    when('given an inherited property name', () => {
      then(
        'it narrows false — the guard tests OWN keys, never the chain',
        () => {
          // a corrupt or brand-new peer could put `constructor` or `toString` on the wire; an
          // `in` check would pass them and read copy off an inherited function
          expect({
            constructor: isCloneOperationalRejectReason('constructor'),
            toString: isCloneOperationalRejectReason('toString'),
            hasOwnProperty: isCloneOperationalRejectReason('hasOwnProperty'),
          }).toEqual({
            constructor: false,
            toString: false,
            hasOwnProperty: false,
          });
        },
      );
    });
    when('given an unknown slug or null', () => {
      then('it narrows false', () => {
        expect(isCloneOperationalRejectReason('modal-holds-focus')).toEqual(
          false,
        );
        expect(isCloneOperationalRejectReason(null)).toEqual(false);
      });
    });
  });
});
