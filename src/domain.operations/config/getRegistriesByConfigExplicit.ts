import type { RoleRegistry } from '@src/domain.objects';
import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';

/**
 * .what = get registries from explicit config (rhachet.use.ts)
 * .why = loads RoleRegistry[] from user-declared config file
 * .note = only used by JIT path (tsx); bun path reads from .agent/ directly
 */
export const getRegistriesByConfigExplicit = async (input: {
  opts: InvokeOpts<{ config: string }>;
}): Promise<RoleRegistry[]> => {
  const config: { getRoleRegistries: () => Promise<RoleRegistry[]> } =
    await import(input.opts.config);
  return await config.getRoleRegistries();
};
