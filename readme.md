# rhachet

![test](https://github.com/ehmpathy/rhachet/workflows/test/badge.svg)
![publish](https://github.com/ehmpathy/rhachet/workflows/publish/badge.svg)

A framework for reliable, thorough thought. Weave threads of thought via stitches.

# purpose

1. simplify usage of thought routes
2. simplify usage of thread roles
3. standardize the accumulation of thought tactics
5. assure a ratchet like guarantee of progress; no wasted time on intractable solutions, fails fast upon slippage
6. assure a guarded budget for resource utilization, with observability
7. enable intuitive observability of thought routes, history, and artifacts

# install

```sh
npm install rhachet
```

# use


### declare a role

```ts
// ./roles/mechanic

import { Role } from 'rhachet';
import { genWeaveStrategize } from 'rhachet-tactics-bhrain';
import { tacticsStudyCodebase, tacticsProposeCodediff, tacticsProduceCodediff } from './role/mechanic/tactics';

export const role = new Role({
  name: "mechanic",
  weave: genWeaveStrategize({
    study: [
      ...tacticsStudyCodebase,
    ],
    propose: [
      ...tacticsProposeCodediff
    ],
    produce: [
      ...tacticsProduceCodediff
    ]
  })
})
```

where

```ts
const tacticsStudyCodebase: Weave[]
```

### invoke the role

```sh
npx rhachet --role ./roles/mechanic --desire "add endpoint to get weather"
```
