# option O1: symlink the lock dir to global

## .what

point each actor's `.oauth_refresh.lock` (and the legacy `<realpath>.lock`) at one shared path, so
N actors serialize on one lock.

## .verdict — ⛔ dead

proper-lockfile takes a lock via `mkdir(lockfilePath)` and releases it via `rmdir(lockfilePath)`.
a symlink at the lock path makes `mkdir` fail with `EEXIST` forever (the lock reads as held), and
`rmdir` on a symlink fails with `ENOTDIR`.

## .citations

the lock options, keyed on the config dir `e`:

```js
function q_r(e,n){return{lockfilePath:ad(e,".oauth_refresh.lock"),realpath:!1,stale:60000,update:5000,onCompromised:...}}
```

both locks taken in `wuo(e)`:

```js
g=await ei(e,q_r(e,s)), y=`${await DM(e).catch(()=>e)}.lock`, E=await ei(y,{...q_r(e,s),lockfilePath:y})
```

the refresh path takes them at `wuo(_S())`, where `_S()` is the config dir:

```js
let D=_S();await le().mkdir(D);F=await wuo(D)
```
