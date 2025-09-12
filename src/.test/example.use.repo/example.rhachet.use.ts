import { RoleRegistry } from '../../contract/sdk';
import { EXAMPLE_REGISTRY } from './example.echoRegistry';

export const getRoleRegistries = async (): Promise<RoleRegistry[]> => {
  return [EXAMPLE_REGISTRY];
};
