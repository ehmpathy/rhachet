import { asHeadlessSessionMessage } from './asHeadlessSessionMessage';

/**
 * .what = prove the headless message names the no-display cause + both fixes, and
 *         folds the owner flag in/out
 * .why  = this is the distinct headless guidance the vision promised; its text is
 *         the human-visible surface, so it gets a real regression net (snapshot +
 *         explicit assertions)
 */
describe('asHeadlessSessionMessage', () => {
  const CASES = [
    {
      description: 'with an owner → the fix carries --owner',
      owner: 'ehmpath',
      expectFlag: '--owner ehmpath',
    },
    {
      description: 'owner null → no --owner in the fix',
      owner: null,
      expectFlag: null,
    },
  ] as const;

  CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const message = asHeadlessSessionMessage({ owner: thisCase.owner });

      // names the ONE real cause — no display — not the merged three-cause text
      expect(message).toContain('no display');
      // both fixes are named: local desktop, or a passphrase-less key
      expect(message).toContain('local desktop');
      expect(message).toContain('passphrase-less key');
      // it points at the retry command
      expect(message).toContain('rhx keyrack unlock');

      // the owner flag folds in only when an owner is set
      if (thisCase.expectFlag === null)
        expect(message).not.toContain('--owner');
      else expect(message).toContain(thisCase.expectFlag);

      // snap the exact text so its shape + words cannot silently drift
      expect(message).toMatchSnapshot();
    }),
  );
});
