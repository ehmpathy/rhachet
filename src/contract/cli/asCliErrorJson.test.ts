import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asCliErrorJson } from './asCliErrorJson';

/**
 * .what = an error whose `cause` is unchecked — the shape `[case10] [t0]` proves is the
 *   one door a hostile metadata value can enter through
 * .why = the cast is deliberate, never a convenience. `cause` is typed `Error`, and a
 *   type erases at runtime; what actually keeps a hostile value out of it is a
 *   convention held by an `instanceof` guard at each of ~20 throw sites. that is an
 *   audit, not a construction, and this transformer is the last layer either way
 * .note = file-scoped because TWO cases need it — `[case10]` drives each hostile payload
 *   one at a time, and `[case11]` pins them all in one snapshot. one definition, so the
 *   two cannot drift apart
 */
const asErrorWithUncheckedCause = (input: {
  message: string;
  cause: unknown;
}): Error =>
  new MalfunctionError(input.message, { cause: input.cause as Error });

describe('asCliErrorJson', () => {
  given('[case1] a ConstraintError with a hint', () => {
    const error = new ConstraintError('bad --as value', {
      hint: 'use --as @:<slug>',
    });

    when('[t0] projected', () => {
      then('it names the class, message, and hint', () => {
        const shape = asCliErrorJson({ error });
        expect(shape.class).toEqual('ConstraintError');
        expect(shape.message).toEqual('bad --as value');
        expect(shape.hint).toEqual('use --as @:<slug>');
      });

      then('reachState is null (no reach metadata)', () => {
        expect(asCliErrorJson({ error }).reachState).toBeNull();
      });
    });
  });

  given('[case2] a MalfunctionError with no metadata', () => {
    const error = new MalfunctionError('the socket server crashed');

    when('[t0] projected', () => {
      then('it names the class and message, hint null', () => {
        const shape = asCliErrorJson({ error });
        expect(shape.class).toEqual('MalfunctionError');
        expect(shape.message).toEqual('the socket server crashed');
        expect(shape.hint).toBeNull();
      });
    });
  });

  given('[case3] a reach error whose metadata holds a reachState', () => {
    const error = new ConstraintError('no live clone for this address', {
      hint: 're-enroll to spawn a fresh clone',
      reachState: 'DEAD',
      reachCause: 'DEAD-same-host',
    });

    when('[t0] projected', () => {
      then('reachState is read off the metadata, not re-derived', () => {
        expect(asCliErrorJson({ error }).reachState).toEqual('DEAD');
      });

      then('reachCause carries the FINER same-host cause', () => {
        // a machine consumer needs DEAD-same-host (re-enroll here) distinct from
        // DEAD-cross-host (reach from origin) — the coarse reachState collapses both
        expect(asCliErrorJson({ error }).reachCause).toEqual('DEAD-same-host');
      });
    });
  });

  given('[case4] an error whose metadata.reachState is a garbage value', () => {
    const error = new ConstraintError('weird', { reachState: 'FLYING' });

    when('[t0] projected', () => {
      then('the invalid reachState is dropped to null (guarded)', () => {
        expect(asCliErrorJson({ error }).reachState).toBeNull();
      });
    });
  });

  given(
    '[case5] a wedged dispatch fault (reachCause, but NO reachState)',
    () => {
      // the two in-flight faults (wedged / exited-mid-dispatch) are thrown by sayClone
      // with a reachCause but NO reachState — so reachState alone reads them as a
      // generic error (null). reachCause is the ONLY field that names them to a machine
      const error = new ConstraintError(
        'the clone accepted the connection but did not answer in time',
        {
          hint: 'the brain may be busy — retry, or re-enroll if it stays unresponsive',
          reachCause: 'wedged',
        },
      );

      when('[t0] projected', () => {
        then('reachCause names the wedged fault', () => {
          expect(asCliErrorJson({ error }).reachCause).toEqual('wedged');
        });

        then(
          'reachState is null — the wedged fault carries no coarse state',
          () => {
            // this is the exact machine-parity gap the projection closes: without
            // reachCause, a wedged fault is indistinguishable from any other error
            expect(asCliErrorJson({ error }).reachState).toBeNull();
          },
        );
      });
    },
  );

  given('[case6] an exited-mid-dispatch fault', () => {
    const error = new ConstraintError(
      'the clone exited while the message was in flight',
      {
        hint: 're-enroll to spawn a fresh clone, then re-send',
        reachCause: 'exited-mid-dispatch',
      },
    );

    when('[t0] projected', () => {
      then('reachCause names the exited-mid-dispatch fault', () => {
        expect(asCliErrorJson({ error }).reachCause).toEqual(
          'exited-mid-dispatch',
        );
      });
    });
  });

  given('[case7] an error whose metadata.reachCause is a garbage value', () => {
    const error = new ConstraintError('weird', { reachCause: 'SPINNING' });

    when('[t0] projected', () => {
      then('the invalid reachCause is dropped to null (guarded)', () => {
        expect(asCliErrorJson({ error }).reachCause).toBeNull();
      });
    });
  });

  given('[case8] a non-reach error (no reach metadata at all)', () => {
    const error = new ConstraintError('bad --as value', {
      hint: 'use --as @:<slug>',
    });

    when('[t0] projected', () => {
      then('both reachState and reachCause are null', () => {
        const shape = asCliErrorJson({ error });
        expect(shape.reachState).toBeNull();
        expect(shape.reachCause).toBeNull();
      });
    });
  });

  given(
    '[case9] an error whose metadata carries a nested Error as `cause`',
    () => {
      // the exact shape 19 throwers use — `cause: error instanceof Error ? error : undefined`
      const error = new MalfunctionError('actor manifest is corrupt', {
        manifestPath: '/repo/.agent/.actors/actor.json',
        cause: new SyntaxError('Unexpected token } in JSON at position 42'),
      });

      when('[t0] projected', () => {
        then('the nested Error is projected to its class + message', () => {
          expect(asCliErrorJson({ error }).metadata.cause).toEqual({
            class: 'SyntaxError',
            message: 'Unexpected token } in JSON at position 42',
          });
        });

        // 🚨 this row asserts the SERIALIZED form, which is the form both channels actually
        //   emit — `withCliOutputErrors` json-stringifies the shape, and `asCliErrorFrame`
        //   stringifies the metadata block. an `Error`'s own props are non-enumerable, so the
        //   defect this whole case exists for is visible ONLY after a round-trip: the payload
        //   renders `{}`, which announces a cause and shows none.
        //
        //   ⚠️ it is NOT here because the field assertion above is blind to that — a dogfood
        //   run under the raw pass-through reddened both rows, so `toEqual` does part an
        //   Error from a plain object. the two rows assert two different artifacts (the
        //   in-memory value, and the bytes a human reads), and only this one names the second
        then(
          'it SURVIVES json serialization rather than flattens to {}',
          () => {
            const serialized = JSON.parse(
              JSON.stringify(asCliErrorJson({ error }).metadata),
            );
            expect(serialized.cause).toEqual({
              class: 'SyntaxError',
              message: 'Unexpected token } in JSON at position 42',
            });
          },
        );

        then('a non-Error metadata value is passed through untouched', () => {
          expect(asCliErrorJson({ error }).metadata.manifestPath).toEqual(
            '/repo/.agent/.actors/actor.json',
          );
        });
      });
    },
  );

  given(
    '[case10] a metadata payload the last-layer render must survive',
    () => {
      /**
       * 🚨 the TOTALITY clamp, and the reason it is worth a case of its own: every row here
       *   sits inside the catch that renders a cli failure. a throw from the serializer does
       *   not degrade the report — it escapes the catch, and the human gets node's own raw
       *   dump in place of the classified frame this whole pipeline exists to produce
       *   (raised by the r007 `behavior-hazards` lane at i076).
       *
       * ⚠️ each row asserts the SERIALIZED bytes, never only the projected value. `[t6]`'s
       *   defect is invisible until a round-trip, and the faults `[t1]`/`[t3]` cure live
       *   inside `JSON.stringify` itself — so a row that stopped at the in-memory object
       *   would never reach the call under test.
       *
       * 🚨 `[t0]` is where this case earns its shape, and what it measures NARROWS the lane's
       *   claim: a `HelpfulError` cannot even be CONSTRUCTED with a hostile value in an
       *   ordinary metadata field. `cause` is the one field exempt from that check, so it is
       *   the one door — which is why `[t1]`/`[t3]` drive it rather than a plain field.
       */

      // .note = `asErrorWithUncheckedCause` is file-scoped, so `[case11]` can pin the same
      //   payloads whole that this case drives one at a time. its docblock, at the top of
      //   the file, owns the reason the cast is deliberate

      when('[t0] the premises themselves', () => {
        then(
          '`JSON.stringify` really does refuse both — measured, not assumed',
          () => {
            /**
             * 🚨 the premise clamp. every projection below is justified by a claim about
             *   `JSON.stringify`, and a branch justified by an unmeasured claim is a branch
             *   nobody can ever retire
             *   (`rule.require.clamp-the-premise-a-guard-rests-on`).
             */
            const cyclic: Record<string, unknown> = { name: 'a' };
            cyclic.self = cyclic;
            expect(() => JSON.stringify(cyclic)).toThrow(TypeError);
            expect(() => JSON.stringify({ count: 1n })).toThrow(TypeError);
          },
        );

        then(
          'a HelpfulError REFUSES a hostile value in a plain field, at CONSTRUCTION',
          () => {
            /**
             * 🚨 the row that narrows the lane's claim. `HelpfulError`'s constructor
             *   serializes its own metadata into `.message`, so a cyclic or BigInt value in
             *   an ordinary field faults ONE LAYER UP and never reaches this transformer.
             *   ⇒ every ordinary field that arrives here arrived PROVEN serializable, and a
             *   guard aimed at one would be redundant.
             */
            const cyclic: Record<string, unknown> = { slug: 'a' };
            cyclic.self = cyclic;
            expect(() => new MalfunctionError('x', { graph: cyclic })).toThrow(
              TypeError,
            );
            expect(() => new MalfunctionError('x', { offset: 1n })).toThrow(
              TypeError,
            );
          },
        );

        then(
          '…but `cause` is EXEMPT from that check, and reaches us raw',
          () => {
            /**
             * ⚠️ the one door. the constructor omits `cause` (and `code`) from the pass above,
             *   while the `.metadata` getter returns `cause` — so a value there is the ONLY
             *   one that reaches this render unchecked. delete this row and the two below it
             *   read as guards against an impossible payload.
             */
            const cyclic: Record<string, unknown> = { slug: 'a' };
            cyclic.self = cyclic;
            expect(() =>
              asErrorWithUncheckedCause({ message: 'x', cause: cyclic }),
            ).not.toThrow();
            const error = asErrorWithUncheckedCause({
              message: 'x',
              cause: cyclic,
            });
            expect(
              (error as { metadata?: Record<string, unknown> }).metadata?.cause,
            ).toBe(cyclic);
          },
        );
      });

      when('[t1] a metadata value references itself', () => {
        then('the cycle is cut and the frame still renders', () => {
          const cyclic: Record<string, unknown> = { slug: 'clone-a' };
          cyclic.parent = cyclic;
          const error = asErrorWithUncheckedCause({
            message: 'the clone graph is corrupt',
            cause: cyclic,
          });

          const serialized = JSON.parse(
            JSON.stringify(asCliErrorJson({ error }).metadata),
          );
          expect(serialized.cause).toEqual({
            slug: 'clone-a',
            parent: '[circular]',
          });
        });
      });

      when('[t2] two peer fields reference ONE object', () => {
        then('it is a DAG, never a cycle — both render in full', () => {
          /**
           * 🚨 the row that forces an ANCESTOR check over a seen-ever check. a set that only
           *   grows renders the second reference as `[circular]` — a false report on a graph
           *   `JSON.stringify` handles fine.
           *
           * ⚠️ the pair MUST nest under ONE top-level key, and that is not cosmetic. a fresh
           *   `WeakSet` is minted per top-level key, so two PEER keys are walked with two
           *   independent sets and the `ancestors.delete` is never reached. this row was
           *   written the peer way first, and a dogfood measured it green under the exact
           *   mutation it names — a clamp with no teeth
           *   (`rule.require.clamp-edge-cases`).
           */
          const shared = { host: 'grove-1' };
          const error = new MalfunctionError('a reach moved hosts', {
            move: { before: shared, after: shared },
            // the peer pair stays too, with its own teeth: it reddens if ONE set is ever
            // shared across top-level keys, which is the same false report one level up
            alsoBefore: shared,
            alsoAfter: shared,
          });

          const serialized = JSON.parse(
            JSON.stringify(asCliErrorJson({ error }).metadata),
          );
          expect(serialized.move).toEqual({
            before: { host: 'grove-1' },
            after: { host: 'grove-1' },
          });
          expect(serialized.alsoBefore).toEqual({ host: 'grove-1' });
          expect(serialized.alsoAfter).toEqual({ host: 'grove-1' });
        });
      });

      when('[t3] a metadata value is a BigInt', () => {
        then('it renders its literal form rather than refuses', () => {
          const error = asErrorWithUncheckedCause({
            message: 'the offset is out of range',
            cause: { offset: 9007199254740993n, nested: { also: 42n } },
          });

          const serialized = JSON.parse(
            JSON.stringify(asCliErrorJson({ error }).metadata),
          );
          expect(serialized.cause).toEqual({
            offset: '9007199254740993n',
            nested: { also: '42n' },
          });
        });
      });

      when('[t4] a metadata value declares its own `toJSON`', () => {
        then('the method survives the walk', () => {
          // 🚨 the row that forbids a blanket rebuild. a `Date` carries no own enumerable
          //   property, so a walk that reconstructed it would render `{}` — a silent data
          //   loss introduced by the function written to prevent one
          const expiredAt = new Date('2026-09-06T12:00:00.000Z');
          const error = new MalfunctionError('the lease expired', {
            expiredAt,
          });

          const serialized = JSON.parse(
            JSON.stringify(asCliErrorJson({ error }).metadata),
          );
          expect(serialized.expiredAt).toEqual('2026-09-06T12:00:00.000Z');
        });
      });

      when('[t5] a metadata value nests deeper than the walk bound', () => {
        then('it reports a floor rather than overflows the stack', () => {
          // ⚠️ the cycle guard cannot catch this — the chain is ACYCLIC, merely long. an
          //   overflow inside the render loses the report exactly as a TypeError would
          const deep = Array.from({ length: 40 }).reduce<
            Record<string, unknown>
          >((inner) => ({ inner }), { floor: true });
          const error = new MalfunctionError('the payload is nested', { deep });

          expect(() =>
            JSON.stringify(asCliErrorJson({ error }).metadata),
          ).not.toThrow();
          expect(JSON.stringify(asCliErrorJson({ error }).metadata)).toContain(
            '[too deep]',
          );
        });
      });

      when('[t6] a nested Error sits inside a plain object', () => {
        then(
          'the walk reaches it, where the one-level projection could not',
          () => {
            // the gap the prior `.note` named outright: *"a deeper chain is a real gap and a
            //   bounded walk is the fix."* the cycle guard is what made the walk safe to take
            const error = new MalfunctionError('the batch had a failure', {
              results: [{ cause: new SyntaxError('bad token') }],
            });

            const serialized = JSON.parse(
              JSON.stringify(asCliErrorJson({ error }).metadata),
            );
            expect(serialized.results).toEqual([
              { cause: { class: 'SyntaxError', message: 'bad token' } },
            ]);
          },
        );
      });
    },
  );

  given('[case11] every variant a machine consumer could parse', () => {
    /**
     * 🚨 the rows above assert FIELD BY FIELD, and a field read is blind to exactly the
     *   things a machine consumer breaks on: an absent field, an extra field, a key whose
     *   order moved, a value whose serialized form drifted. this case pins the WHOLE shape
     *   for each variant (`rule.require.contract-snapshot-exhaustiveness`).
     *
     * ⚠️ snapped through `JSON.parse(JSON.stringify(...))`, never off the in-memory object
     *   — the contract is the BYTES a consumer receives, and a projection that looks right
     *   in memory can still serialize wrong (the defect `[t6]` above measures).
     *
     * 🚨 .the bar this case holds itself to = ONE ROW PER VARIANT THE ROWS ABOVE ASSERT.
     *   it opened with four, and a peer review measured the gap: eight variants were
     *   graded field by field and never snapped whole — the three reach shapes, and the
     *   five metadata payloads the walk has to survive. a case that CLAIMS exhaustiveness
     *   and samples a third of its own file is worse than one that claims none, because
     *   its docblock retires the very question a reader would otherwise ask.
     *
     *   ⇒ so the map below is keyed to mirror the givens it pins, and a new variant added
     *   above owes a row here in the same edit.
     */
    const asSerialized = (error: Error): unknown =>
      JSON.parse(JSON.stringify(asCliErrorJson({ error })));

    /**
     * .what = replaces every iso instant in a serialized shape with `$ISO_INSTANT`
     * .why = a tracked `.snap` may carry no iso instant — the repo gate refuses one on
     *   sight, since it cannot tell a frozen fixture from a live clock, and a gate that
     *   could make that distinction would be a gate that misses a real stamp.
     *
     * ⚠️ it re-serializes through a string pass rather than a walk of the object, so a
     *   stamp nested at ANY depth is caught. a per-key mask would have to know the key,
     *   and the next fixture to carry a `Date` will not use `expiredAt`.
     */
    const asIsoInstantMasked = (shape: unknown): unknown =>
      JSON.parse(
        JSON.stringify(shape).replace(
          /\d{4}-\d{2}-\d{2}T[\d:.]*\d+Z/g,
          '$ISO_INSTANT',
        ),
      );

    /**
     * .what = a payload that references itself
     * .why = it reaches `metadata.cause` unchecked (the one door `[t0]` above names), and
     *   it renders differently from a DAG on purpose — a cycle is cut to `[circular]`, a
     *   shared reference renders in full. a snapshot that held one and not the other could
     *   not tell the two apart
     */
    const asCyclic = (): Record<string, unknown> => {
      const cyclic: Record<string, unknown> = { slug: 'clone-a' };
      cyclic.parent = cyclic;
      return cyclic;
    };

    when('[t0] each variant is serialized whole', () => {
      then('the complete shape of each is pinned', () => {
        const shared = { host: 'grove-1' };
        expect({
          // ── the class + hint axis ────────────────────────────────────────────
          'constraint, with hint': asSerialized(
            new ConstraintError('bad --as value', {
              hint: 'use --as @:<slug>',
            }),
          ),
          'malfunction, no metadata': asSerialized(
            new MalfunctionError('the socket server crashed'),
          ),
          'unclassified plain Error': asSerialized(new Error('bare')),

          // ── the reach axis — the projected fields a machine branches on ──────
          'reach, coarse state AND finer cause': asSerialized(
            new ConstraintError('no live clone for this address', {
              hint: 're-enroll to spawn a fresh clone',
              reachState: 'DEAD',
              reachCause: 'DEAD-same-host',
            }),
          ),
          'reach, wedged — a cause with NO state': asSerialized(
            new ConstraintError(
              'the clone accepted the connection but did not answer in time',
              {
                hint: 'the brain may be busy — retry, or re-enroll if it stays unresponsive',
                reachCause: 'wedged',
              },
            ),
          ),
          'reach, exited-mid-dispatch': asSerialized(
            new ConstraintError(
              'the clone exited while the message was in flight',
              {
                hint: 're-enroll to spawn a fresh clone, then re-send',
                reachCause: 'exited-mid-dispatch',
              },
            ),
          ),

          // ── the metadata-walk axis — every payload the render has to survive ──
          'nested Error in metadata.cause': asSerialized(
            new MalfunctionError('the parse failed', {
              cause: new SyntaxError('bad token'),
            }),
          ),
          'nested Error inside an array': asSerialized(
            new MalfunctionError('the batch had a failure', {
              results: [{ cause: new SyntaxError('bad token') }],
            }),
          ),
          'cyclic metadata.cause': asSerialized(
            asErrorWithUncheckedCause({
              message: 'the clone graph is corrupt',
              cause: asCyclic(),
            }),
          ),
          'a DAG — two references to ONE object': asSerialized(
            new MalfunctionError('a reach moved hosts', {
              move: { before: shared, after: shared },
            }),
          ),
          'BigInt in metadata.cause': asSerialized(
            asErrorWithUncheckedCause({
              message: 'the offset is out of range',
              cause: { offset: 9007199254740993n, nested: { also: 42n } },
            }),
          ),
          /**
           * ⚠️ the instant is MASKED here, and the mask costs this row naught. what
           *   `[t4]` proves is that a `Date` survives the walk as an ISO STRING rather
           *   than collapse to `{}` — and `[t4]` already asserts the exact value
           *   pointwise. this table grades the SHAPE, so a placeholder still shows a
           *   string where a `{}` would be a visible diff.
           *
           * 🚨 .why mask a value that cannot drift = the fixture is hardcoded, so the
           *   permadrift the repo gate guards against is impossible here. but the gate
           *   reads a tracked `.snap` for an iso instant and cannot tell a frozen
           *   fixture from a live clock — and a gate that had to make that distinction
           *   would be a gate that misses real stamps. so the mask is owed to the
           *   RULE rather than to the risk, and that is the correct trade.
           */
          'a value with its own toJSON (Date)': asIsoInstantMasked(
            asSerialized(
              new MalfunctionError('the lease expired', {
                expiredAt: new Date('2026-09-06T12:00:00.000Z'),
              }),
            ),
          ),
          'nested past the walk bound': asSerialized(
            new MalfunctionError('the payload is nested', {
              deep: Array.from({ length: 40 }).reduce<Record<string, unknown>>(
                (inner) => ({ inner }),
                { floor: true },
              ),
            }),
          ),
        }).toMatchSnapshot();
      });
    });
  });
});
