## .what

rhachet's role hooks map `onBoot` · `onTool` · `onStop` to claude events (`howto.use.brain.hooks`);
none maps to claude's `PermissionRequest`. so a role cannot declare a permission-request hook, and a
repo that wants one registers it by hand in `settings.of.repo.json` — where the hook sync never writes
it, an old-layout migration drops it, and a fresh layout never has it. nheuron holds one such hand
entry (`permissionrequest.decide-permissions.sh`, of the mechanic role).

## .bounded diff

1. a role hook kind for the event (e.g. `hooks.onBrain.onPermission`) in the rhachet role contract
2. the anthropic adapter (`src/_topublish/rhachet-brains-anthropic`) translates it to a
   `PermissionRequest` entry, authored `role=<slug>` like every other role hook — so the hook sync
   writes it into `settings.of.repo.json`, and requirement case 9's role filter narrows it per clone
3. tests: the adapter's translate test, and the hook sync's integration test for the new kind
4. a follow-up in `ehmpathy/rhachet-roles-ehmpathy`: the mechanic role declares its hook there, and
   nheuron's hand entry goes

## .origin

rhachet route `v2026_10_15.fix-split-layout-local-settings-arrow`, fulcrum F7
