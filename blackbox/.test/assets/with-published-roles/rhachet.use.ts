import type { RoleRegistry } from 'rhachet';

import { getRoleRegistry as getRoleRegistryEhmpathy } from 'rhachet-roles-ehmpathy';

export const getRoleRegistries = (): RoleRegistry[] => [getRoleRegistryEhmpathy()];
export const getInvokeHooks = () => [];
