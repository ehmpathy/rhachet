# rhachet

![test](https://github.com/ehmpathy/rhachet/workflows/test/badge.svg)
![publish](https://github.com/ehmpathy/rhachet/workflows/publish/badge.svg)

A framework for reliable, thorough thought. Weave threads of thought via stitches.

# purpose

1. simplify usage of thought routes
2. enable accumulation of thought tactics

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
  aliases: ['code monkey', 'software engineer'],
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
