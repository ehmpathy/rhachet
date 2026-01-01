import type { z } from 'zod';

import type { InvokeOpts } from '.';
import type { Role, RoleSkillRegistry } from './Role';

/**
 * .what = extracts input type for a single skill from a skill registry
 * .why = enables type inference for skill inputs in hooks
 */
type SkillInputFromRegistry<
  TRegistry extends RoleSkillRegistry,
  TSkill extends keyof TRegistry,
> = z.infer<TRegistry[TSkill]['input']>;

/**
 * .what = union type of all skill inputs from a registry
 * .why = enables onInvokeActInput to accept any valid skill input
 */
type AnySkillInputFromRegistry<TRegistry extends RoleSkillRegistry> = {
  [K in keyof TRegistry]: {
    skill: K;
    input: SkillInputFromRegistry<TRegistry, K>;
  };
}[keyof TRegistry];

/**
 * .what = hooks for customizing invoke behavior
 * .why = enables input transformation before skill execution
 *
 * .note = generic TRole enables type-safe onInvokeActInput when Role.typed() is used
 */
export interface InvokeHooks<TRole extends Role = Role> {
  /**
   * .what = transforms ask input before execution
   */
  onInvokeAskInput: Array<
    (
      input: InvokeOpts<{ ask: string; config: string }>,
    ) => InvokeOpts<{ ask: string; config: string }>
  >;

  /**
   * .what = transforms act input before skill execution
   * .why = enables input manipulation (e.g., adding defaults, validation)
   *
   * .note = strongly typed when TRole preserves literal skill names via Role.typed()
   */
  onInvokeActInput?: TRole['skills']['rigid'] extends RoleSkillRegistry
    ? (
        input: AnySkillInputFromRegistry<NonNullable<TRole['skills']['rigid']>>,
      ) => AnySkillInputFromRegistry<
        NonNullable<TRole['skills']['rigid']>
      >['input']
    : (input: {
        skill: string;
        input: Record<string, unknown>;
      }) => Record<string, unknown>;
}
