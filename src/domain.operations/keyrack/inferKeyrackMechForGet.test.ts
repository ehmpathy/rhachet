import { inferKeyrackMechForGet } from './inferKeyrackMechForGet';

describe('inferKeyrackMechForGet', () => {
  it('should return mech from JSON blob with mech field', () => {
    const value = JSON.stringify({
      appId: '12345',
      privateKey: '...',
      mech: 'EPHEMERAL_VIA_GITHUB_APP',
    });
    expect(inferKeyrackMechForGet({ value })).toBe('EPHEMERAL_VIA_GITHUB_APP');
  });

  it('should return PERMANENT_VIA_REPLICA for JSON without mech field', () => {
    const value = JSON.stringify({ appId: '12345', privateKey: '...' });
    expect(inferKeyrackMechForGet({ value })).toBe('PERMANENT_VIA_REPLICA');
  });

  it('should return PERMANENT_VIA_REPLICA for plain string', () => {
    const value = 'ghp_abcdef123456';
    expect(inferKeyrackMechForGet({ value })).toBe('PERMANENT_VIA_REPLICA');
  });

  it('should return PERMANENT_VIA_REPLICA for malformed JSON', () => {
    const value = '{ invalid json }';
    expect(inferKeyrackMechForGet({ value })).toBe('PERMANENT_VIA_REPLICA');
  });

  it('should return PERMANENT_VIA_REPLICA for empty string', () => {
    expect(inferKeyrackMechForGet({ value: '' })).toBe('PERMANENT_VIA_REPLICA');
  });

  it('should handle JSON with non-string mech field', () => {
    const value = JSON.stringify({ mech: 123 });
    expect(inferKeyrackMechForGet({ value })).toBe('PERMANENT_VIA_REPLICA');
  });
});
