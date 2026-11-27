# F4 — a repo with no manifest stays wire-less

## .the fork
- a: no manifest → no wire, as today
- b: always wire, and let the dispatcher refuse an absent manifest

## .taken = a, why
an absent manifest fails closed in the dispatcher (`hooks.dispatch.sh:81-88`): b would hold every tool call of a repo not yet synced. the derive already passes such settings through (`setActorHookDispatchManifestDerived.ts:58-59`).

.note = not free. the repo sync reads an absent manifest as zero rules
(`setHookDispatchManifestRederived.ts:27`); under F3, zero rules wire four events. so the sync owes
an explicit guard on manifest presence, as the clone derive already holds. demoed in `case=9`.

## .rework = clean, why
one guard in `setHookDispatchersForTarget`; the derive path is unchanged.

## .confidence = 95%

## .where
`setActorHookDispatchManifestDerived.ts`, `setHookDispatchersForTarget.ts`
