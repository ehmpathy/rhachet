# rhachet

![test](https://github.com/ehmpathy/rhachet/workflows/test/badge.svg)
![publish](https://github.com/ehmpathy/rhachet/workflows/publish/badge.svg)

Build reusable roles via rhachet: a framework for reliable, thorough thought.

> Weave threads 🧵 of thought via stitches 🪡.

# purpose

1. declare thought routes, reusably and maintainably
2. apply thought routes, observably and reliably
3. compose and accumulate reusable thought tactics
4. assure slipless progress towards goals, like a ratchet
5. assure guarded budgets of money and time, with route plans, expense approvals, and circuit breakers
6. observe thought routes and weaves intuitively

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
