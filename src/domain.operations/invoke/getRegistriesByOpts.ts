import type { RoleRegistry } from '@src/domain.objects';
import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';

/**
 * .what = get registries from the invocation options declared
 * .why = loads RoleRegistry[] from rhachet.use.ts config file
 * .note = only used by JIT path (tsx); bun path reads from .agent/ directly
 */
export const getRegistriesByOpts = async (input: {
  opts: InvokeOpts<{ config: string }>;
}): Promise<RoleRegistry[]> => {
  const config: { getRoleRegistries: () => Promise<RoleRegistry[]> } =
    await import(input.opts.config);
  return await config.getRoleRegistries();
};
