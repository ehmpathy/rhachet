import type { RoleRegistry } from '@src/domain.objects';
import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';

/**
 * .what = get registries from the invocation options declared
 * .how =
 *   - lookup the config based on the options
 *   - grab the registries from the config
 */
export const getRegistriesByOpts = async (input: {
  opts: InvokeOpts<{ config: string }>;
}): Promise<RoleRegistry[]> => {
  // import the config
  const config: { getRoleRegistries: () => Promise<RoleRegistry[]> } =
    await import(input.opts.config);

  // grab the registries
  return await config.getRoleRegistries();
};
