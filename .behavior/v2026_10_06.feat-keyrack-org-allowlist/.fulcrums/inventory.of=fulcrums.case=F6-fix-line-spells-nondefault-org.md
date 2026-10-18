# F6 — a fix line spells `--org` for a non-default org only

**the fork** — `getKeyrackKeyGrant`'s fix lines spell `--org` only for `@all` today (:129). under a list a member's fix line must name the member (case=8). (a) spell `--org <slugOrg>` only when it is not the default — the default org threads into the grant context · (b) spell `--org` for every real org, always.

**taken** — (a). the default path is the common path and is carried in 8 snapshot files (`getKeyrackKeyGrant.ts:159-160`); (a) leaves every one byte-identical and changes output only where the allowlist is in use. (b) is simpler code but moves every snapshot and adds a flag to every fix line a human already reads correctly.

**rework** — clean. one interpolation; the snapshot move under (b) is mechanical.

**confidence** — 75%. (b) has a real merit: a fix line that always names its org is self-contained, true even when copied into another repo.

**where** — `case=8`.

**verdict** — open.
