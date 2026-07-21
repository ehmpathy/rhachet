import { genRhachetUseConfig } from './genRhachetUseConfig';

describe('genRhachetUseConfig', () => {
  it('should generate config for single package with aliased imports', () => {
    const result = genRhachetUseConfig({
      packages: ['rhachet-roles-ehmpathy'],
    });

    // Verify aliased imports for single package
    expect(result).toContain(
      "import { getRoleRegistry as getRoleRegistryEhmpathy, getInvokeHooks as getInvokeHooksEhmpathy } from 'rhachet-roles-ehmpathy'",
    );

    // Snapshot for observability
    expect(result).toMatchSnapshot();
  });

  it('should generate config for multiple packages', () => {
    const result = genRhachetUseConfig({
      packages: ['rhachet-roles-ehmpathy', 'rhachet-roles-other'],
    });

    // Verify multiple packages are included
    expect(result).toContain(
      'getRoleRegistryEhmpathy(), getRoleRegistryOther()',
    );
    expect(result).toContain('getInvokeHooksEhmpathy(), getInvokeHooksOther()');

    // Snapshot for observability
    expect(result).toMatchSnapshot();
  });

  it('should convert kebab-case to PascalCase for aliases', () => {
    const result = genRhachetUseConfig({
      packages: ['rhachet-roles-my-custom-roles'],
    });

    // Verify key elements
    expect(result).toContain('getRoleRegistryMyCustomRoles');
    expect(result).toContain('getInvokeHooksMyCustomRoles');

    // Snapshot for observability
    expect(result).toMatchSnapshot();
  });
});
