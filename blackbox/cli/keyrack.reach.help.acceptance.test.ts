import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = `--help` clamps for every command that gained `--reach`
 * .why = a cli flag is a PUBLISHED CONTRACT, and `--help` is the one place a human looks
 *        to learn it exists (`rule.require.help-on-demand`). a flag that works but is
 *        undiscoverable is a flag nobody finds
 *
 * .note = these are the five commands `--reach` was threaded onto, and this file is the
 *         only place that says so as an executable claim. drop the option from any one of
 *         them and the diff goes red here — where a behavior test would stay green,
 *         because the flag would still PARSE while it went unadvertised
 * .note = the `toContain('--reach')` is the clamp with teeth; the snapshot beside it
 *         catches a silent change to the DESCRIPTION, which is the part a human reads to
 *         learn what a reach even is (`rule.forbid.friction-hazards`)
 */
describe('keyrack --reach help', () => {
  given('[case1] any repo', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    // one `when` per command, so a drop on ONE of the five names itself in the failure
    for (const command of ['set', 'get', 'unlock', 'del', 'source'] as const) {
      when(`[t-${command}] rhx keyrack ${command} --help`, () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            binary: 'rhx',
            args: ['keyrack', command, '--help'],
            cwd: repo.path,
            env: { HOME: repo.path },
          }),
        );

        then('exits with status 0', () => {
          expect(result.status).toEqual(0);
        });

        then('help advertises --reach', () => {
          expect(result.stdout).toContain('--reach');
        });

        then('help says what a reach names, in plaintext', () => {
          // every one of the five descriptions carries the same worked example, so a
          // human learns the shape once and it reads the same on every command
          expect(result.stdout).toContain('beav@ehmpathy.com');
        });

        // .note = the plaintext example above teaches the account form, which is the one a
        //         human meets first. it does NOT teach the form the WISH exists for — a
        //         cross-org github-app reach — and two commands shipped without it while
        //         three had it, so the set was already half-consistent
        // .note = the two forms are not two syntaxes. a reach exid is OPAQUE plaintext,
        //         and `github://org=$org` is a CONVENTION that only the github-app mech
        //         reads (in `asGithubOrgFromReach`). so both examples are the same field,
        //         and to show only one leaves the headline scenario undiscoverable
        //         (`rule.require.discoverability`)
        then('help also demonstrates the cross-org github form', () => {
          expect(result.stdout).toContain('github://org=ehmpathy');
        });

        // ⚠️ .what = the constraint half of the contract, split by whether a command CAN
        //         sweep. `set` and `del` take `--key` as a `requiredOption`, so commander
        //         refuses a keyless call before their action ever runs — there is no sweep
        //         to guard and no constraint to state. the other three take `--key`
        //         optionally, because each has a real bulk form (`get --for repo`,
        //         `unlock --env`, a bare `source` sweep), so on those three a reach without
        //         a key is a refusal a human can actually meet
        // ⚠️ .why = this assertion is here because its ABSENCE let a real drift ship. the
        //         four checks above compare the flag, the plaintext example, the github
        //         example, and the full render — four consistency clamps — and not one of
        //         them looks at the constraint sentence. so `source` advertised `--reach`
        //         with no word of the rule while `get` and `unlock` stated it, and every
        //         assertion in this file stayed green. a suite proves the shape it checks
        //         and is silent on every other (`rule.require.clamp-edge-cases`)
        const canSweep = command !== 'set' && command !== 'del';

        then(
          canSweep
            ? 'help states that a reach requires a key — this command can sweep'
            : 'help omits the requires-key note — commander already demands --key',
          () => {
            expect(result.stdout.includes('requires --key')).toEqual(canSweep);
          },
        );

        // .note = the stderr half is not ceremony on a HELP path — it is the claim that
        //         `--help` is a clean success. commander writes usage to stderr when it
        //         rejects a command, so a stray stderr line here is the signal that help
        //         was served by an error path rather than by the help path
        then('the reply is snapped', () => {
          expect(result.stdout).toMatchSnapshot('stdout');
          expect(result.stderr).toMatchSnapshot('stderr');
        });
      });
    }
  });
});
