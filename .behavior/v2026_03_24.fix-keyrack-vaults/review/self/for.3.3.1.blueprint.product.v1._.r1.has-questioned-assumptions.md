# self-review: has-questioned-assumptions

## stone
3.3.1.blueprint.product.v1

## question
what hidden technical assumptions did i make? are they based on evidence or habit?

## review

### assumption: os.daemon adapter exists but is not exported

**evidence:** the blueprint says "[~] index.ts — export vaultAdapterOsDaemon" which implies it exists but is not exported.

**question:** did i verify this? what if it doesn't exist at all?

**verification needed:** check `src/domain.operations/keyrack/adapters/vaults/` for vaultAdapterOsDaemon.ts

**what if opposite:** if it doesn't exist, phase 1 scope increases significantly. the blueprint would need a [+] marker instead of [~].

### assumption: vaultAdapter1Password.set() throws currently

**evidence:** the blueprint says "1password: exists but set() throws".

**question:** did i verify this? what is the current implementation?

**verification needed:** read vaultAdapter1Password.ts to confirm set() behavior.

**what if opposite:** if set() already works, phase 2 may be simpler or unnecessary.

### assumption: daemon sdk has daemonAccessUnlock that we can reuse

**evidence:** the blueprint says "[←] daemonAccessUnlock() — reuse daemon sdk"

**question:** does this function exist? what are its exact parameters?

**verification needed:** check daemon sdk exports.

### assumption: op cli check should be a separate file

**evidence:** the blueprint says "[+] isOpCliInstalled.ts"

**question:** could a simpler approach work? could it be inline in the adapter?

**counter-argument:** separation enables reuse across set/unlock/get and enables unit test. the check is used in multiple flows per the codepath tree.

**verdict:** separation is warranted. not habit.

### assumption: promptHiddenInput can be reused for exid prompt

**evidence:** the blueprint says "[○] promptHiddenInput.ts — retain, reuse for prompts"

**question:** is this appropriate? exid is not hidden — it's a reference URI, not a secret.

**issue found:** exid is NOT a secret. it should be visible as the user types. hidden prompt would obscure `op://vault/item/field` which causes bad ux.

**fix:** use regular prompt for exid, not hidden prompt. update blueprint to reflect this.

### assumption: host manifest skip means no write at all

**evidence:** the blueprint says "[+] skip host manifest write — new: pure ephemeral"

**question:** what about read? does get() need manifest lookup?

**counter-argument:** os.daemon keys are in daemon only. get() reads from daemon, not manifest. no manifest read needed either.

**verdict:** holds. pure ephemeral means no manifest interaction.

### assumption: 9h expiry is handled by daemon

**evidence:** the vision mentions "9h default, dies on logout". blueprint doesn't mention expiry handler.

**question:** does the daemon already handle expiry? or do we need to implement it?

**verification needed:** check if daemon has built-in TTL for keys.

**assumption holds if:** daemon already has TTL logic. blueprint doesn't add expiry handler because it's extant.

## issues found

1. **promptHiddenInput for exid is wrong** — exid is not a secret, should be visible

## fixes applied

1. blueprint will need update to use regular prompt for exid input (not promptHiddenInput)

## verdict

one assumption was invalid: hidden prompt for exid. the exid is a reference URI that should be visible to the user as they type it. will need to update the blueprint to use a regular prompt mechanism.

other assumptions require verification against actual code before execution phase.
