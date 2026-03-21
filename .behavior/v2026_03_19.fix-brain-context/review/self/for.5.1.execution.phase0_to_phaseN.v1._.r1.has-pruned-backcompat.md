# review.self: has-pruned-backcompat

## review scope

reviewed backwards compatibility concerns against the wish to verify they were explicitly requested.

## backwards compat concerns found

### 1. TContext = Empty default

**concern**: `BrainAtom<TContext = Empty>` and `BrainRepl<TContext = Empty>` default to `Empty`

**was this explicitly requested?** yes

from the wish:
> "backwards compatible via TContext = Empty default"

**evidence this is needed**: yes — extant brains that don't specify context will continue to work without modification

**conclusion**: explicitly requested, not assumed

### 2. context remains optional (context?: TContext)

**concern**: context parameter is optional, not required

**was this explicitly requested?** yes

from the wish:
> "the type enforces optionality via [K in ...]?: TSupplies"

and from the vision:
> "without context — brain falls back or fails fast; types are backwards compatible"

**evidence this is needed**: yes — extant callers that don't pass context will continue to work

**conclusion**: explicitly requested, not assumed

## backwards compat not found

no assumed backwards compat was added. all backwards compat measures trace directly to the wish or vision.
