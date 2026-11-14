# F5 — the refresh deletes the entry before it queues; an in-flight pre-login read export is the residue

- **fork** — (a) delete the entry only under the hold, so read callers in the refresh's wait read the
  pre-login entry; (b) delete it at call time and again under the hold, and accept that a read export
  already in flight from before the login may land its value before the refresh takes the key;
  (c) a tombstone with a login stamp that a read holder must check before it writes, which closes (b)'s
  residue but needs a compare-and-swap the disk cache does not offer, so it still races at the rename
- **taken** — (b). it closes the long window — the whole of the refresh's wait in the queue — with one
  extra delete. the residue needs a read export that began on the old sso token before the login and
  ended after it; that caller's raw export would have returned the same creds before this change, and
  the aws cli's own `~/.aws/cli/cache` carries the same stance
- **rework** — clean. (c) sits inside the op's write step; no caller contract changes
- **confidence 80%, low because** — the username-mismatch recovery is the case that motivates the
  refresh, and there the residue is another user's creds, for at most one waiter's poll after the
  in-flight holder frees the key
- **where** — `getOneAwsProfileExport` refresh form (vision contract); case 7 [t3]
- **verdict** — unresolved, for the wisher
