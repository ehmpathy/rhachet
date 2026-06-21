import type { RoleRegistry } from 'rhachet';

/**
 * .what = rhachet framework configuration file
 * .why = rhachet discovers this file to load registries and brains
 *
 * .note = exports both getRoleRegistries and getBrainRepls per framework contract
 *         this is intentional — the file implements rhachet's expected interface
 */
export const getRoleRegistries = (): RoleRegistry[] => [];
export const getBrainRepls = () => [];
