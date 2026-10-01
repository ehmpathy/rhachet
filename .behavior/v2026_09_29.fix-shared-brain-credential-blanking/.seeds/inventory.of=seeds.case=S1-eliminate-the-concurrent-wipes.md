# seed S1: eliminate the concurrent wipes

## .said

> no dude just eliminate the concurrent wipes

> i dont want us to pivot to a new auth scheme

> i want us to stop the failures

## .settled

the defect is the concurrent refresh that blanks a shared credential. the cure removes the race;
it does not trade the fleet onto a different auth scheme to route around it.

## .landed

- `refs/` — the lock-path findings that locate the race
