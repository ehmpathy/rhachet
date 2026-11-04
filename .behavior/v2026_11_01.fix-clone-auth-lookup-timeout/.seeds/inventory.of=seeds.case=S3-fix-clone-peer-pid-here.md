# S3 — the clone gate's peer-pid misread is fixed in this PR; the daemon's is its own issue

## .said

asked: "A new test shows getSocketPeerCred reads the reader's own pid, not the peer's (measured: read 3004316 = self, peer was 3009574). So the clone same-user gate passes any caller (only the 0700 socket dir protects it), and the keyrack daemon's session gate shares the same parser. How should this PR handle it?"
chose: "Fix clone gate here (Recommended)" — getSocketPeerCred reads the PEER's line; no visible pid → deny, fail closed; unit tests on real ss-shaped fixtures + the child-peer integration test. the keyrack daemon's gate becomes its own issue, since flipping it changes who keyrack admits.

## .settled

this PR makes `getSocketPeerCred` read the pid from the line whose PEER column holds our inode.
the shared `asSocketPeerPidFromSs` stays as is for the keyrack daemon; its misread is filed apart.

## .landed

- F8 verdict
