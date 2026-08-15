/**
 * .what = lightweight actor/clone entry point for rhachet
 * .why = enables consumers to import the actor (recipe) + clone (engageable)
 *        without the full SDK (stitchers, templates, etc.)
 *
 * .note = these are the IN-MEM grain; the SDK speaks the bare `Actor`/`Clone`
 *   (the `Inmem` partition suffix stays internal — define.actor-clone-partitions.md)
 *
 * usage:
 *   import { genActor, genClone, Actor, Clone, Role } from 'rhachet/actors';
 */

// the in-mem actor (recipe) — a list of roles + a brain allowlist
export {
  type ActorBrain,
  ActorInmem as Actor,
  type SkillInput,
  type SkillOutput,
} from '@src/domain.objects/ActorInmem';
export { ActorRoleSkill } from '@src/domain.objects/ActorRoleSkill';
// the in-mem clone (engageable) — baked from an actor, carries .act/.run/.ask
export {
  type CloneActOp,
  type CloneAskOp,
  CloneInmem as Clone,
  type CloneRunOp,
} from '@src/domain.objects/CloneInmem';
// role domain objects (needed for actor creation)
export { Role, type RoleSkillSchema } from '@src/domain.objects/Role';
export type { RoleContext } from '@src/domain.objects/RoleContext';
export type { RoleHooks } from '@src/domain.objects/RoleHooks';
export { RoleRegistry } from '@src/domain.objects/RoleRegistry';
export { RoleSkill } from '@src/domain.objects/RoleSkill';
export type { RoleTrait } from '@src/domain.objects/RoleTrait';
export { ACTOR_ASK_DEFAULT_SCHEMA } from '@src/domain.operations/actor/actorAsk';
// actor (recipe) + clone (engageable) operations
export { genActor } from '@src/domain.operations/actor/genActor';
export { genCloneInmem as genClone } from '@src/domain.operations/clone.inmem/genCloneInmem';
export { enrollThread } from '@src/domain.operations/role/enrollThread';
// role operations (commonly used with actors)
export { genRoleSkill } from '@src/domain.operations/role/genRoleSkill';
export { getRoleBriefs } from '@src/domain.operations/role/getRoleBriefs';
