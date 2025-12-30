import type { InvokeHooks, RoleRegistry } from 'rhachet';

import { getRoleRegistry as getRoleRegistryBhrain, getInvokeHooks as getInvokeHooksBhrain } from 'rhachet-roles-bhrain';
import { getRoleRegistry as getRoleRegistryBhuild, getInvokeHooks as getInvokeHooksBhuild } from 'rhachet-roles-bhuild';
import { getRoleRegistry as getRoleRegistryEhmpathy, getInvokeHooks as getInvokeHooksEhmpathy } from 'rhachet-roles-ehmpathy';

export const getRoleRegistries = (): RoleRegistry[] => [getRoleRegistryBhrain(), getRoleRegistryBhuild(), getRoleRegistryEhmpathy()];
export const getInvokeHooks = (): InvokeHooks[] => [getInvokeHooksBhrain(), getInvokeHooksBhuild(), getInvokeHooksEhmpathy()];
