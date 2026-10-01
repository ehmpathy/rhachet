# seed S3: rotate live clones on our timeline

## .said

> ok so whats that api key helper?

> how would that work ?

> thatd be cool

> if we can just give it our own operation to run

> then you just setup your creds via rhachet into keyrack once and rotate easily on the machine?

> cause midspawn rotation is the most important thing

> we want to be able to rotate on our timeline

> and have it propagate within a 15min ttl OR as soon as theres a session usage limit exceeded.
> knawmean ?

## .settled

- **mid-spawn rotation is the top requirement.** a credential swap must reach clones that are
  already live — never only the next spawn
- rotation happens on the operator's timeline, not the vendor's refresh schedule
- a swap propagates to every live clone within a **15-minute ttl**, OR **at once** when a clone
  hits a session usage limit — whichever comes first
- the mechanism of choice is a credential source claude-code re-reads through an operation we
  supply (a rhachet/keyrack command), so creds are set once per host and rotated in one place

## .landed

- (unlanded) the vision rework
