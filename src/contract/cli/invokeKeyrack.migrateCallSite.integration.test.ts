import { given, then } from 'test-fns';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = pin WHERE migration is called: `migrateKeyrackManifestToVariantA` is called
 *         EXACTLY ONCE in the cli, from the `unlock` handler alone, and is ABSENT from
 *         the shared prelude (`genContextKeyrackFromCliOpts`) that set/del/list/recipient
 *         /fill also use
 * .why  = migration is a full re-key (re-seals the manifest AND every os.secure blob,
 *         and fires the passphrase dialog to derive K). the vision mandates it fire on
 *         `unlock` ONLY — the one command whose contract already means "prove identity
 *         now". if a later refactor "helpfully" moves the call into the shared prelude,
 *         a bare `keyrack list` would trigger a passphrase popup + a whole-file re-key
 *         as a hidden side-effect (rule.forbid.surprises), and — worse — is EXACTLY the
 *         regression shape that caused the 2026-07-30 brick this feature guards against.
 *         no behavioral test caught that shape (r10 i039 blocker #3); this source-level
 *         call-site guard does, cheaply and hermetically
 *
 * .note = source-level guard (reads the cli + prelude source), so it is an integration
 *         test (fs boundary). it clamps the CALL SITE, which a behavioral matrix over
 *         every non-unlock command against a legacy manifest cannot do as precisely —
 *         the regression is "the call moved", and this asserts exactly where it lives
 * .note = the assertions read the migrate symbol as an invocation `symbol(`, so an
 *         import of it (line 52 of invokeKeyrack) is not miscounted as a call — only
 *         call forms are tallied. the same holds for the prelude: it may NAME the symbol
 *         in a doc cross-reference (the r11 nit-3 ask — "migration is NOT run here by
 *         design, see migrateKeyrackManifestToVariantA's unlock-only call site"), which
 *         aids the next engineer; only a CALL `symbol(` in the prelude is the regression
 */
describe('invokeKeyrack — migration is called from unlock ONLY (no-prelude-migrate guard)', () => {
  const CLI_PATH = join(__dirname, 'invokeKeyrack.ts');
  const PRELUDE_PATH = join(
    __dirname,
    '../../domain.operations/keyrack/genContextKeyrackFromCliOpts.ts',
  );
  const MIGRATE_SYMBOL = 'migrateKeyrackManifestToVariantA';

  given('the shared cli prelude (genContextKeyrackFromCliOpts)', () => {
    const preludeSource = readFileSync(PRELUDE_PATH, 'utf8');

    then('it never CALLS migration — the prelude fires no re-key', () => {
      // the shared prelude is used by set/del/list/recipient/fill AND unlock. if a
      // migrate CALL ever appears here, one of those read-shaped commands would fire
      // a re-key + dialog as a hidden side-effect — the exact regression this guards.
      // a doc cross-reference that NAMES the symbol (no `(` call) is allowed and good
      // — it tells the next engineer the omission is deliberate (r11 nit-3)
      expect(preludeSource).not.toContain(`${MIGRATE_SYMBOL}(`);
    });
  });

  given('the keyrack cli (invokeKeyrack)', () => {
    const cliSource = readFileSync(CLI_PATH, 'utf8');

    then('it invokes migration EXACTLY once', () => {
      // count invocation forms `migrateKeyrackManifestToVariantA(` — not the import,
      // which has no open paren after the symbol. more than one call site = migration
      // leaked into a second command
      const callCount = cliSource.split(`${MIGRATE_SYMBOL}(`).length - 1;
      expect(callCount).toEqual(1);
    });

    then('the single call sits within the unlock command handler', () => {
      // slice the source at the `unlock` command marker; the migrate call must fall
      // AFTER it and BEFORE the next `.command(` marker (the relock handler). this
      // proves the call lives in unlock's action, not another command's
      const unlockMarker = ".command('unlock')";
      const unlockStart = cliSource.indexOf(unlockMarker);
      expect(unlockStart).toBeGreaterThan(-1);

      // the next `.command(` after unlock bounds the unlock handler's block
      const nextCommandStart = cliSource.indexOf(
        '.command(',
        unlockStart + unlockMarker.length,
      );
      expect(nextCommandStart).toBeGreaterThan(unlockStart);

      const migrateCallAt = cliSource.indexOf(`${MIGRATE_SYMBOL}(`);
      expect(migrateCallAt).toBeGreaterThan(unlockStart);
      expect(migrateCallAt).toBeLessThan(nextCommandStart);
    });
  });
});
