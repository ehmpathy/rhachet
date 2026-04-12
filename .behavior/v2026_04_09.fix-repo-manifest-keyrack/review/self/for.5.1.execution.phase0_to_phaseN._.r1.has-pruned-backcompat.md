# self-review: has-pruned-backcompat

## questions applied

for each backwards-compat concern, asked:
1. did the wisher explicitly say to maintain this compatibility?
2. is there evidence this backwards compat is needed?
3. or did we assume it "to be safe"?

## analysis

### is there any prior interface?

no. `repo compile` is a new command:
- no prior `repo compile` command existed
- no prior `compile` functionality existed in rhachet
- users previously used manual rsync commands in their own package.json scripts

### backwards compat concerns found

none.

this is greenfield code. there is no extant interface to maintain compatibility with.

### clarification: rsync inspiration is not backwards compat

the implementation uses rsync-style precedence semantics:
- user exclude > user include > default exclude > default include

this is not backwards compat — it's a design choice for familiar UX. users familiar with rsync will recognize the behavior, but there's no extant rhachet interface being preserved.

## conclusion

no backwards compat concerns. new command, no prior interface to preserve.
