# review.self: has-pruned-backcompat

## question: did we add backwards compat not requested?

### backwards compat concerns in this implementation

**none identified.**

this is a new guard, not a modification of extant behavior. the implementation:
- adds a new failfast check
- does not modify extant code paths
- does not add fallbacks or shims

### will this break extant packages?

yes — `rhachet-roles-*` packages without boot hooks will now fail `repo introspect`.

**is this backwards compat we should maintain?**

no. from the wish:
> "this failfast will prevent a common footgun at build time"
> "we should just make it clear. lets failfast for now"

the wisher explicitly wants to break extant packages that lack boot hooks. that's the purpose of this guard.

### did we add any backwards compat shims?

no. we did not:
- add `--skip-boot-hook-check` flag
- add environment variable to disable
- add deprecation notice before failfast
- grandfather extant packages

all of these would be backwards compat concerns that were NOT requested.

### conclusion

no backwards compat concerns added. the guard fails immediately as requested.
