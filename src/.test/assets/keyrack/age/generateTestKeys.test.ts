import * as age from 'age-encryption';

describe('generateTestKeys', () => {
  it('generates an age key pair', async () => {
    const identity = await age.generateIdentity();
    const recipient = await age.identityToRecipient(identity);

    console.log('\n=== TEST AGE KEYS ===');
    console.log('identity:', identity);
    console.log('recipient:', recipient);
    console.log('===================\n');

    expect(identity).toMatch(/^AGE-SECRET-KEY-/);
    expect(recipient).toMatch(/^age1/);
  });
});
