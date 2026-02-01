/**
 * .what = lightweight actor-focused entry point for rhachet
 * .why = enables consumers to import actor functionality
 *        without the full SDK (stitchers, templates, etc.)
 *
 * usage:
 *   import { genActor, Actor, Role } from 'rhachet/actors';
 */

// actor domain objects
export {
  Actor,
  type ActorActOp,
  type ActorAskOp,
  type ActorBrain,
  type ActorRunOp,
  type SkillInput,
  type SkillOutput,
} from '@src/domain.objects/Actor';
export { ActorRoleSkill } from '@src/domain.objects/ActorRoleSkill';
// role domain objects (needed for actor creation)
export { Role, type RoleSkillSchema } from '@src/domain.objects/Role';
export type { RoleContext } from '@src/domain.objects/RoleContext';
export type { RoleHooks } from '@src/domain.objects/RoleHooks';
export { RoleRegistry } from '@src/domain.objects/RoleRegistry';
export { RoleSkill } from '@src/domain.objects/RoleSkill';
export type { RoleTrait } from '@src/domain.objects/RoleTrait';
export { ACTOR_ASK_DEFAULT_SCHEMA } from '@src/domain.operations/actor/actorAsk';
// actor operations
export { genActor } from '@src/domain.operations/actor/genActor';
export { enrollThread } from '@src/domain.operations/role/enrollThread';
// role operations (commonly used with actors)
export { genRoleSkill } from '@src/domain.operations/role/genRoleSkill';
export { getRoleBriefs } from '@src/domain.operations/role/getRoleBriefs';
