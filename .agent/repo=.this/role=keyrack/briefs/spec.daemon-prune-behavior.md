# spec.daemon-prune-behavior

## .what

defines expected behavior for `keyrack daemon prune` command.

## .why

daemon processes persist with their startup bytecode. when code changes (e.g., fallback logic), the active daemon still uses old code. `relock` only prunes keys from memory — it does NOT restart the daemon. users need a way to kill daemons so fresh ones start with current bytecode.

---

## criteria

### usecase.1 = prune daemon for current owner

```
given(daemon is active for owner=default)
  when(user runs `rhx keyrack daemon prune`)
    then(kills the daemon process)
    then(removes socket and pid files)
    then(next keyrack command starts fresh daemon with current bytecode)
```

**expected stdout:**

```
$ rhx keyrack daemon prune

🔐 keyrack daemon prune
   └─ pruned daemon for owner=default (pid: 12345)
```

### usecase.2 = prune daemon for specific owner

```
given(daemon is active for owner=ehmpath)
  when(user runs `rhx keyrack daemon prune --owner ehmpath`)
    then(kills the daemon process for that owner)
    then(removes socket and pid files for that owner)
    then(does NOT affect daemons for other owners)
```

**expected stdout:**

```
$ rhx keyrack daemon prune --owner ehmpath

🔐 keyrack daemon prune
   └─ pruned daemon for owner=ehmpath (pid: 67890)
```

### usecase.3 = prune all daemons

```
given(multiple daemons active for various owners)
  when(user runs `rhx keyrack daemon prune --owner @all`)
    then(kills all daemon processes for current session)
    then(removes all socket and pid files)
```

**expected stdout:**

```
$ rhx keyrack daemon prune --owner @all

🔐 keyrack daemon prune
   ├─ pruned daemon for owner=default (pid: 12345)
   ├─ pruned daemon for owner=ehmpath (pid: 67890)
   └─ pruned 2 daemons
```

### usecase.4 = no daemon active

```
given(no daemon is active for owner=default)
  when(user runs `rhx keyrack daemon prune`)
    then(reports no daemon found)
    then(exits 0 (not an error))
```

**expected stdout:**

```
$ rhx keyrack daemon prune

🔐 keyrack daemon prune
   └─ no daemon active for owner=default
```

---

## inputs

```
given(--owner not specified)
  then(defaults to owner=default)
    sothat(single-owner is common case)

given(--owner specified)
  then(prunes daemon for that owner only)

given(--owner @all specified)
  then(prunes all daemons for current session)
```

---

## implementation notes

- daemon socket path: `$XDG_RUNTIME_DIR/keyrack.$sessionId[.$owner].sock`
- daemon pid file: `$XDG_RUNTIME_DIR/keyrack.$sessionId[.$owner].pid`
- session id from `/proc/$PID/sessionid`
- kill via SIGTERM
- cleanup socket and pid files after kill

---

## see also

- `spec.key-unlock-behavior.md` — unlock starts daemon if not active
- `rule.require.lookup-time-fallback.md` — fallback logic in daemon code

