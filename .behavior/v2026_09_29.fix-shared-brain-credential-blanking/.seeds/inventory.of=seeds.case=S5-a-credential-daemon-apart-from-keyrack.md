# seed S5: a credential daemon apart from keyrack

## .said

> we'd use a separate daemon for this cause one day keyrack will be a dependency of rhachet, but
> not combined

## .settled

- a credential watcher or rotator runs as its own daemon
- it may consume keyrack, but it does not live inside the keyrack daemon
- keyrack is headed out of rhachet into a separate dependency, so rhachet's credential machinery
  must not be coupled into it

## .landed

- `refs/inventory.of=options.case=O10-adopt-the-winner.md` — the watcher is its own daemon
