# seed S2: one subscription per reach, held in keyrack

## .said

> hey actually, lets consider the earlier idea once more. lets say we set the setup tokens into
> keyrack. lets say we set a setup token per reach, per subscription we have. we have 7. how will it
> know which one to use out of the 7? would we set the default one === the reach one and auth just
> uses the default one for the org and then default one for the machine in waterfall? and when an
> auth swap happens, how soon does that propagate ?

## .settled

- a host holds several subscription credentials at once — one per reach (org), seven today
- they live in keyrack, set once per host through rhachet
- a clone's credential is chosen by waterfall: the org's credential, else the machine default
- the propagation latency of a swap is a first-class property of the design, not an afterthought

## .landed

- (unlanded) the vision rework
