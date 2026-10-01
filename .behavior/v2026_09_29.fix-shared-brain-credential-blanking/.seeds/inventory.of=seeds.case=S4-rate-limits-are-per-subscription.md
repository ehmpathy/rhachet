# seed S4: rate limits are per subscription

## .said

> anthropic explicitly suggest folks get multiple subscriptions to avoid these ratelimits. they
> ratelimit tokens per subscription, not total tokens

## .settled

- the usage limit is metered per subscription, so a fleet that holds several subscriptions and
  routes load across them is in scope for this design
- a swap to another subscription when one hits its limit (S3's usage-limit trigger) is a wanted
  behavior, not a fulcrum to hold back

## .landed

- (unlanded) the vision rework
