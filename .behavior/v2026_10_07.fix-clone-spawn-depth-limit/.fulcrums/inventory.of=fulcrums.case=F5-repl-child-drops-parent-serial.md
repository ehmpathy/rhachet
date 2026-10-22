# F5 — a repl child drops the parent's serial and socket

**the fork:** (a) leave `RHACHET_CLONE_SERIAL` / `RHACHET_CLONE_SOCKET` as inherited · (b) unset
them for the supplier call.

**taken:** (b). they name the caller clone; a repl brain is not that clone, and a `clone whoami`
or a `clone say` to self from inside it would act as the parent.

**rework:** clean — two keys in one scoped env.

**confidence:** 80%. a role package might rely on a review brain that sees its parent's serial.
the search: `rhx grepsafe --pattern 'RHACHET_CLONE_SERIAL|RHACHET_CLONE_SOCKET' --path node_modules
--glob '*.{js,sh}'`. one reader found: `rhachet-roles-bhrain`'s `getRouteDriverCloneAddr`, which
defaults `route.reminder` to the caller's own serial. under (b) a review brain that sets a
reminder no longer aims it at the driver that spawned it, and must pass the address explicitly —
the intent of (b), since the reviewer is not the driver. no reader that needs the parent's serial
inside a review brain was found.

**where:** `src/domain.operations/brain/asBrainReplWithContextBound.ts`.

**verdict:** —
