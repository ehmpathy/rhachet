/**
 * .what = the bound on one peer-credential lookup's `ss -x` scan, which names the peer inode of a
 *   unix socket
 * .why = the scan's cost scales with the host's socket table and load. a 5s bound killed it on
 *   loaded boxes, and the clone gate read the kill as a deny: a same-user `clone say` refused as
 *   `auth-denied` (ehmpathy/rhachet#678)
 * .note = the lookup runs `ss` with no shell, so the kill lands on `ss` itself at this bound
 *   (getSocketPeerCred.integration.test.ts [case2]: a 1s bound over a 5s `ss` settles at ~1s)
 */
export const SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS = 60_000;
