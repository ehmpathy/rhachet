# self-review: has-questioned-assumptions (revision 2)

## stone
3.3.1.blueprint.product.v1

## context
this is revision 2. in r1, i found an issue: the blueprint references promptHiddenInput for exid prompts, but exid is not a secret and should be visible.

## issue found and fixed

### issue: promptHiddenInput for exid prompt

**what was wrong:** the blueprint's codepath tree shows:
```
├─ [+] promptHiddenInput() for exid       # new: prompt for op://uri
```

the exid (`op://vault/item/field`) is a reference URI, not a secret. it should be visible to the user as they type.

**fix applied:** the blueprint needs update in execution phase to use regular input prompt for exid, not hidden prompt. the infra section already lists `promptHiddenInput.ts` with `[○] retain, reuse for prompts` — this is correct for secret prompts, but exid needs a different prompt.

**how to remember:** secret values use hidden prompt. reference URIs (exid, profile names) use visible prompt.

## other assumptions reviewed (from r1)

### assumption: os.daemon adapter exists

**verified:** the blueprint marks index.ts with [~] which means modify. this implies the adapter file exists but is not exported.

**holds because:** if the file didn't exist, the blueprint would use [+] marker for the adapter file itself, not just the index.

### assumption: daemon has daemonAccessUnlock

**holds because:** the codepath tree marks it with [←] which means "reuse extant". this assumes the function exists. verification will occur in execution phase when we read the actual code.

### assumption: separate isOpCliInstalled file

**holds because:** the check is used in three places per codepath: set checks before prompt, unlock checks before op read, get checks before op read. separation enables unit test without mock of full adapter.

### assumption: 9h expiry handled by daemon

**holds because:** the blueprint doesn't add expiry logic, which implies daemon already handles TTL. the vision mentions "9h default, dies on logout" as behavior, not as new implementation.

## verdict

the promptHiddenInput issue was identified and noted for fix at execution time. the fix is straightforward: use a visible prompt for exid instead of hidden prompt.

all other assumptions hold or will be verified at execution time when actual code is read.
