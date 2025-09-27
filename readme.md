# rhachet

![test](https://github.com/ehmpathy/rhachet/workflows/test/badge.svg)
![publish](https://github.com/ehmpathy/rhachet/workflows/publish/badge.svg)

Build reusable roles with rhachet: a framework for reliable, composable, and iteratively improvable thought.

> Weave threads 🧵 of thought, stitched 🪡  with a rhachet ⚙️

# vision

Build or use digital actors, who work even from your laptop, and work for anyone you choose.

Distill your skills and roles iteratively, with rhachet. Use them, compose them, share them, open source them. The choice is yours.

- With open source top to bottom, we can raise the floor and prosper collectively.
- With observable routes of thought, we can not only debug, but align.
- With composable thought routes, we can build incremental complexity and automate test coverage just like any code.

Here's to a solarpunk future of abundance 🌞🌴

# purpose

1. declare thought routes, reusably and maintainably
2. apply thought routes, observably and reliably
3. compose and accumulate reusable thought skill
4. assure slipless progress towards goals, like a ratchet (🎼 click, click, click)
5. enable iterative improvement of skills, like a ratchet (🎼 click, click, click)
6. assure guarded budgets of money and time, with route plans, expense approvals, and circuit breakers
7. observe thought routes and weaves intuitively

# install

```sh
npm install rhachet
```

# use


## use a prebuilt roles registry

### setup your config file

looks for `@gitroot/rhachet.use.ts` by default

```ts
// @/rhachet.use.ts
import { getRoleRegistry as getBhrainRegistry } from 'rhachet-roles-bhrain';
import { getRoleRegistry as getEhmpathyRegistry } from 'rhachet-roles-ehmpathy';

export const getRoleRegistries = () => [
  getBhrainRegistry(),
  getEhmpathyRegistry(),
  // whichever other registries you'd like
]
```

### perform a skill

```sh
npx rhachet act \
  --repo bhrain --role skeptic --skill review \
  --ask "are birds real? or are they just government drones 🤔"
```

```sh
npx rhachet act \
  --repo ehmpathy --role mechanic --skill review \
  --input "https://github.com/ehmpathy/simple-in-memory-cache/pull/9" \
  --ask "review this pr"
```

```sh
npx rhachet act \
  --repo ehmpathy --role mechanic --skill deliver \
  --input "https://github.com/ehmpathy/domain-objects/issues/7" \
  --ask "push a pr to solve the issue"
```
