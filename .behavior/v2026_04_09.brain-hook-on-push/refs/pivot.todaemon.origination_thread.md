❯ does git.repo.get work for this?                                                                                                         

● Bash(rhx git.repo.get lines --in 0xSero/open-queue --paths 'src/index.ts')
  ⎿  🪨 run solid skill repo=ehmpathy/role=mechanic/skill=git.repo.get

     🐢 far out
     … +136 lines (ctrl+o to expand)

● yes, much better. now i can see the mechanism clearly.

  key insight: opencode-queue does NOT wake idle sessions

  looking at lines 317-342:

  event: async ({ event }) => {
    if (event.type === "session.status") {
      const busy = status.type !== "idle"
      busyBySession.set(sessionID, busy)
      if (!busy && currentMode === "hold") {
        await drain(sessionID)  // ← drains when session becomes idle
      }
    }

    if (event.type === "session.idle") {
      busyBySession.set(sessionID, false)
      if (currentMode === "hold") {
        await drain(sessionID)  // ← drains when session.idle fires
      }
    }
  }

  and drain() at line 236 calls:
  await client.session.prompt({ ... })

  the limitation

  the session must already be running.

  session.idle only fires when an active session transitions from busy → idle (between turns). it does NOT:
  - wake a terminated session
  - wake a sleeping/exited process
  - respond to external filesystem events

  what it actually does

  ┌─────────────────────────────┬─────────────────────────────────────────┐
  │            state            │                behavior                 │
  ├─────────────────────────────┼─────────────────────────────────────────┤
  │ session running, model busy │ queue messages via chat.message hook    │
  ├─────────────────────────────┼─────────────────────────────────────────┤
  │ session running, model idle │ drain queue via client.session.prompt() │
  ├─────────────────────────────┼─────────────────────────────────────────┤
  │ session terminated/exited   │ nothing — no event fires                │
  └─────────────────────────────┴─────────────────────────────────────────┘

  implication for your wish

  opencode-queue solves a different problem: message interruption during active sessions.

  your wish needs: external event → wake sleeping clone.

  that's why your approach 1 (background task polling .agent/.comms/ + exit(2) to enforce restart) is the right direction — there's no
  native "wake from external event" in either OpenCode or Claude Code.

✻ Worked for 60s

❯ why havent folks found ways to wake idle clones?                                                                                         

● Good question. Let me think through the structural reasons:

  1. process model mismatch

  brain CLIs are REPL-style, not daemon-style:

  ┌───────────────────────────────────┬──────────────────────────────────┬────────────────────────────────────┐
  │           architecture            │            idle state            │           wake mechanism           │
  ├───────────────────────────────────┼──────────────────────────────────┼────────────────────────────────────┤
  │ REPL (claude code, opencode)      │ process exits or blocks on stdin │ none — no process to signal        │
  ├───────────────────────────────────┼──────────────────────────────────┼────────────────────────────────────┤
  │ daemon (web server, queue worker) │ process sleeps, awaits events    │ OS signals, socket events, inotify │
  └───────────────────────────────────┴──────────────────────────────────┴────────────────────────────────────┘

  to wake something, it must be listening. a terminated process can't listen.

  2. cost model discourages always-on

  keeping a clone "warm" waiting for events means:
  - process running = memory/cpu
  - context loaded = tokens paid for on every compaction
  - api connection open = potential rate limit consumption

  most users want: invoke → work → exit. not: invoke → wait indefinitely → maybe work.

  3. the use case is rare (until now)

  most brain CLI users are:
  - interactive (human at keyboard)
  - one-shot (CI/CD, scripts)

  the "orchestration" use case — clones coordinating, external systems pushing notifications — is emerging but wasn't the design target.

  4. channels is the first real attempt

  claude code's --channels (research-preview) lets MCP servers push events into a running session. but:
  - session must be running
  - requires MCP server architecture
  - doesn't solve "wake from cold"

  5. the hard problem: who pays for idle?

  ┌───────────────────────────┬──────────────────────┬───────────────────────┐
  │         approach          │       who pays       │       tradeoff        │
  ├───────────────────────────┼──────────────────────┼───────────────────────┤
  │ always-on daemon          │ human (compute cost) │ expensive idle time   │
  ├───────────────────────────┼──────────────────────┼───────────────────────┤
  │ poll from background task │ human (tokens)       │ polling overhead      │
  ├───────────────────────────┼──────────────────────┼───────────────────────┤
  │ external orchestrator     │ human (infra)        │ another system to run │
  ├───────────────────────────┼──────────────────────┼───────────────────────┤
  │ on-demand spawn           │ human (latency)      │ cold start delay      │
  └───────────────────────────┴──────────────────────┴───────────────────────┘

  no free lunch — someone pays for the readiness.

  your approach is novel

  your wish combines:
  1. hook.onStop — verify background poller is active
  2. exit(2) — force restart if poller died
  3. poll .agent/.comms/ — check for messages
  4. role filter — route to right clone

  this is essentially building a daemon out of the REPL by refusing to let it die quietly. clever hack around the architectural gap.

  the reason nobody else did this: they accepted the REPL model as given rather than subverting it.

✻ Worked for 50s

❯ does OpenHands solve this?                                                                                                               

● Web Search("OpenHands AI agent wake idle push notifications event-driven architecture")
  ⎿  Did 1 search in 7s

● Web Search("OpenHands OpenDevin agent runtime sandbox always-on daemon server mode")
  ⎿  Did 1 search in 7s

● Web Search("OpenHands webhook GitHub integration external trigger start agent")
  ⎿  Did 1 search in 7s

● Based on my research, here's the comparison:

  OpenHands Architecture: Server-First

  OpenHands takes a fundamentally different approach:

  ┌───────────────┬──────────────────────────────┬────────────────────────────────────┐
  │    aspect     │    Claude Code / OpenCode    │             OpenHands              │
  ├───────────────┼──────────────────────────────┼────────────────────────────────────┤
  │ runtime       │ REPL process on your machine │ Docker sandbox + API server        │
  ├───────────────┼──────────────────────────────┼────────────────────────────────────┤
  │ idle state    │ process exits                │ container can persist              │
  ├───────────────┼──────────────────────────────┼────────────────────────────────────┤
  │ trigger model │ human types in terminal      │ webhooks, GitHub events, API calls │
  └───────────────┴──────────────────────────────┴────────────────────────────────────┘

  How OpenHands Solves "Wake"

  1. GitHub Action integration: @openhands-agent comment or fix-me label triggers agent spawn
  2. Server mode: REST API server runs inside sandbox, listens for events from the event stream architecture
  3. Cloud deployment: agents run as services, not local processes — inherently wakeable

  external event → webhook/API → spawn container → agent runs

  Why This Works for OpenHands But Not Claude Code

  ┌────────────────┬────────────────────────────────────────────┐
  │ design choice  │                  enables                   │
  ├────────────────┼────────────────────────────────────────────┤
  │ Docker sandbox │ isolated, stateless, spawn-on-demand       │
  ├────────────────┼────────────────────────────────────────────┤
  │ REST API       │ external systems can trigger               │
  ├────────────────┼────────────────────────────────────────────┤
  │ Event stream   │ decoupled from stdin/stdout                │
  ├────────────────┼────────────────────────────────────────────┤
  │ Cloud-native   │ always-on infrastructure absorbs idle cost │
  └────────────────┴────────────────────────────────────────────┘

  The Tradeoff

  OpenHands pays for this with:
  - complexity: Docker, API server, event stream infra
  - latency: cold start to spin up container
  - cost model shift: cloud compute vs local process

  Claude Code optimizes for: human-in-the-loop, local dev, minimal infra.
  OpenHands optimizes for: automation, CI/CD integration, scalable orchestration.

  For Your Wish

  OpenHands' model validates your instinct — external triggers are solvable, but require:
  1. something always listening (daemon/server/webhook endpoint)
  2. spawn mechanism when event arrives
  3. state handoff to new agent instance

  your hook.onStop + exit(2) + polling approach is essentially building a poor-man's daemon inside the REPL constraint. OpenHands just...
  built the daemon.

✻ Baked for 1m 20s

❯ should we use an actual daemon?                                                                                                          

● Good question to pause on. Let me lay out the tradeoffs:

  Daemon Approach

  ┌─────────────┐     inotify      ┌─────────────┐
  │   daemon    │ ←───────────────  │ .agent/.comms │
  │  (always on)│                   └─────────────┘
  └──────┬──────┘
         │ spawn/signal
         ▼
  ┌─────────────┐
  │  brain CLI  │
  └─────────────┘

  ┌──────────────────────┬─────────────────────────────────────────┐
  │         pro          │                   con                   │
  ├──────────────────────┼─────────────────────────────────────────┤
  │ clean separation     │ another process to manage               │
  ├──────────────────────┼─────────────────────────────────────────┤
  │ inotify (no polling) │ platform-specific (systemd/launchd/pm2) │
  ├──────────────────────┼─────────────────────────────────────────┤
  │ OS manages lifecycle │ installation/setup friction             │
  ├──────────────────────┼─────────────────────────────────────────┤
  │ standard pattern     │ coordination complexity                 │
  └──────────────────────┴─────────────────────────────────────────┘

  Hook+Exit(2)+Polling Approach (your wish)

  ┌─────────────┐
  │  brain CLI  │ ←── hook.onStop checks poller
  └──────┬──────┘
         │ exit(2) if no poller
         ▼
  ┌─────────────┐     polls       ┌─────────────┐
  │ bg task     │ ───────────────► │ .agent/.comms │
  │ (in CLI)    │                  └─────────────┘
  └─────────────┘

  ┌────────────────────┬────────────────────────────────────┐
  │        pro         │                con                 │
  ├────────────────────┼────────────────────────────────────┤
  │ self-contained     │ hacky (subverts REPL)              │
  ├────────────────────┼────────────────────────────────────┤
  │ no extra install   │ polling overhead                   │
  ├────────────────────┼────────────────────────────────────┤
  │ works within hooks │ complex lifecycle via hooks        │
  ├────────────────────┼────────────────────────────────────┤
  │ portable           │ brain CLI wasn't designed for this │
  └────────────────────┴────────────────────────────────────┘

  The Real Question

  What's the deployment context?

  ┌─────────────────────────┬─────────────────────────────────────────────────┐
  │         context         │                 recommendation                  │
  ├─────────────────────────┼─────────────────────────────────────────────────┤
  │ your infra, your clones │ daemon is cleaner — you control the environment │
  ├─────────────────────────┼─────────────────────────────────────────────────┤
  │ distributed to users    │ hooks approach — zero extra setup               │
  ├─────────────────────────┼─────────────────────────────────────────────────┤
  │ hybrid                  │ daemon optional, hooks as fallback              │
  └─────────────────────────┴─────────────────────────────────────────────────┘

  My Take

  If this is for rhachet's internal orchestration (foreman dispatching drivers, peer coordination), I'd lean daemon:

  1. rhx comms daemon start — spawns a lightweight watcher
  2. daemon uses inotify/fswatch on .agent/.comms/
  3. daemon spawns claude --resume or signals existing session
  4. hooks become simpler — just verify daemon is running

  The hook+exit(2) approach feels like building a daemon out of duct tape. If you need a daemon, build a daemon.

  But if the goal is "works in any repo with just npx rhachet" — the hooks approach avoids the "install our daemon" friction.

  What's the primary deployment scenario?

✻ Baked for 53s

❯ how would the daemon wake an idle but already alive session?                                                                             

● That's the crux. Let me map the options:

  Option 1: Claude Code Channels (native)

  daemon → MCP server → --channels → running session

  Claude Code's --channels lets MCP servers push events into a live session. But:
  - session must be started with channels enabled
  - requires an MCP server (not just a file watcher)
  - research-preview, API may change

  Option 2: Stdin Injection

  daemon → write to /proc/<pid>/fd/0 → session

  Theoretically possible on Linux, but:
  - terminal owns stdin, not the process
  - race conditions with user input
  - platform-specific
  - fragile

  Option 3: Signal + Convention

  daemon → SIGUSR1 → session reads .agent/.comms/inbox

  Session would need a signal handler that:
  - catches SIGUSR1
  - reads from known location
  - injects into conversation

  But Claude Code doesn't have this built in.

  Option 4: No Wake — Only Spawn

  daemon detects event → spawns NEW session with --resume + prompt

  Accept that you can't inject into a running session. Instead:
  - daemon watches .agent/.comms/
  - if session running and idle: do nothing (let it poll itself)
  - if no session running: spawn one with the message

  Option 5: The Session Polls Itself

  session idle → hook.onStop → poll .comms → exit(2) if message waiting

  This is your wish's approach. The "wake" isn't external — the session wakes itself by refusing to stay idle when messages exist.

  The Honest Answer

  There's no clean way to inject into an already-running Claude Code session from outside, except:

  1. --channels with MCP server (official but complex)
  2. session polls itself (your wish)

  A daemon helps with (2) by making the polling more efficient (inotify instead of sleep loops), but the daemon can't push into the session
   — it can only:
  - signal "hey, check your inbox" (if session has handler)
  - spawn a new session (if none running)
  - write to .comms/ and trust session will poll

  Does channels + MCP server feel worth the complexity? Or does self-polling feel sufficient?

✻ Sautéed for 55s

❯ .... is there a way to have `rhx enroll claude` enable a daemon to write into the terminal that spawned claude?                          

● Now that's a clever angle. Yes — via terminal multiplexer.

  The tmux Approach

  ┌─────────────────────────────────────────┐
  │  tmux session "claude-<id>"             │
  │  ┌───────────────────────────────────┐  │
  │  │  claude code (running)            │  │
  │  │  > waiting for input...           │  │
  │  └───────────────────────────────────┘  │
  └─────────────────────────────────────────┘
          ▲
          │ tmux send-keys
          │
  ┌───────┴───────┐
  │    daemon     │ ← watches .agent/.comms/
  └───────────────┘

  How It Works

  # 1. rhx enroll claude spawns inside tmux
  tmux new-session -d -s "claude-${CLONE_ID}" "claude --resume"

  # 2. user attaches
  tmux attach -t "claude-${CLONE_ID}"

  # 3. daemon injects message
  tmux send-keys -t "claude-${CLONE_ID}" "hey, check .agent/.comms/inbox" Enter

  The message appears in the terminal as if the user typed it.

  Why This Works

  ┌───────────────────┬─────────────────────────────────┐
  │     mechanism     │           capability            │
  ├───────────────────┼─────────────────────────────────┤
  │ tmux send-keys    │ inject keystrokes into any pane │
  ├───────────────────┼─────────────────────────────────┤
  │ tmux capture-pane │ read current output             │
  ├───────────────────┼─────────────────────────────────┤
  │ tmux wait-for     │ synchronization primitives      │
  └───────────────────┴─────────────────────────────────┘

  tmux is essentially an IPC channel disguised as a terminal multiplexer.

  The Flow

  rhx enroll claude
  ├── spawns tmux session with unique id
  ├── registers session id in .agent/.registry/clones/<id>
  ├── starts daemon (or verifies daemon running)
  └── attaches user to tmux session

  daemon (watching .agent/.comms/)
  ├── message arrives for clone <id>
  ├── looks up tmux session from registry
  └── tmux send-keys -t "claude-<id>" "<message>" Enter

  Tradeoffs

  ┌────────────────────────────────────┬───────────────────────────────┐
  │                pro                 │              con              │
  ├────────────────────────────────────┼───────────────────────────────┤
  │ actually injects into live session │ requires tmux                 │
  ├────────────────────────────────────┼───────────────────────────────┤
  │ no polling needed                  │ might interrupt user mid-type │
  ├────────────────────────────────────┼───────────────────────────────┤
  │ well-established pattern           │ another dependency            │
  ├────────────────────────────────────┼───────────────────────────────┤
  │ session persists on disconnect     │ need to manage tmux sessions  │
  └────────────────────────────────────┴───────────────────────────────┘

  Handling "Mid-Type" Interruption

  Could prefix with a pause signal:
  # save user's partial input, inject, restore
  tmux send-keys -t "$session" C-a  # beginning of line
  tmux send-keys -t "$session" C-k  # kill line (saved to tmux buffer)
  tmux send-keys -t "$session" "check .comms" Enter
  # user's partial input is in paste buffer if needed

  Or just accept the interruption — if a push notification is urgent, interrupting is fine.

  Does This Feel Right?

  This makes rhx enroll the "blessed" way to start a brain session, because it sets up the IPC channel. Direct claude invocation wouldn't
  have the daemon hookup.

  Worth the tmux dependency?

✻ Crunched for 55s

❯ like could we grant the daemon write access to that terminal???                                                                          

❯ the actual stdin stream?                                                                                                                 

❯ could we do it without Tmux ?                                                                                                            
                                
● Yes. PTY wrapper.                                                                                                                        

  The Insight                                                                                                                              
                                                                                                                                         
  When you run claude in a terminal, the stdin comes from a PTY (pseudo-terminal) slave. The PTY master is held by your terminal emulator. 
                                                                                                                                           
  If we hold the PTY master instead, we control stdin.                                                                                     
                                                                                                                                         
  Architecture                                                                                                                             
                                  
  ┌─────────────────────────────────────────────────────┐                                                                                  
  │  your terminal                                      │
  │                                                     │                                                                                
  │  ┌───────────────────────────────────────────────┐  │                                                                                  
  │  │  rhx enroll claude (wrapper)                  │  │
  │  │                                               │  │                                                                                  
  │  │   stdin ─────┐      ┌──────── daemon socket   │  │                                                                                
  │  │              ▼      ▼                         │  │                                                                                  
  │  │           ┌──────────┐                        │  │                                                                                
  │  │           │ PTY master│ ◄─── WE CONTROL THIS  │  │                                                                                  
  │  │           └─────┬────┘                        │  │                                                                                
  │  │                 │                             │  │                                                                                  
  │  │           ┌─────▼────┐                        │  │                                                                                  
  │  │           │ PTY slave │                       │  │                                                                                  
  │  │           └─────┬────┘                        │  │                                                                                  
  │  │                 │                             │  │                                                                                  
  │  │           ┌─────▼────┐                        │  │                                                                                  
  │  │           │  claude  │                        │  │
  │  │           └──────────┘                        │  │                                                                                  
  │  └───────────────────────────────────────────────┘  │                                                                                
  └─────────────────────────────────────────────────────┘                                                                                  
                                  
  Data Flow                                                                                                                                
                                                                                                                                           
  ┌────────────────┬──────────────────────────────────────────────────────┐
  │     source     │                         path                         │                                                                
  ├────────────────┼──────────────────────────────────────────────────────┤
  │ user types     │ terminal → wrapper stdin → PTY master → claude       │
  ├────────────────┼──────────────────────────────────────────────────────┤
  │ daemon pushes  │ daemon → unix socket → wrapper → PTY master → claude │
  ├────────────────┼──────────────────────────────────────────────────────┤                                                              
  │ claude outputs │ claude → PTY slave → wrapper → terminal stdout       │                                                                
  └────────────────┴──────────────────────────────────────────────────────┘                                                                
                                                                                                                                           
  Implementation                                                                                                                           
                  
  // rhx enroll claude (simplified)
  import { spawn } from 'node-pty';
  import { createServer } from 'net';                                                                                                    
                                                                                                                                           
  // 1. create PTY - WE hold the master
  const pty = spawn('claude', ['--resume'], {                                                                                              
    name: 'xterm-256color',                                                                                                                
    cols: process.stdout.columns,                                                                                                        
    rows: process.stdout.rows,                                                                                                             
  });                             
                                                                                                                                           
  // 2. relay: user stdin → PTY master                                                                                                     
  process.stdin.pipe(pty);        
                                                                                                                                           
  // 3. relay: PTY master → user stdout                                                                                                  
  pty.pipe(process.stdout);                                                                                                                
                                  
  // 4. daemon socket: accept injections                                                                                                   
  const socket = createServer((conn) => {                                                                                                
    conn.on('data', (msg) => {                                                                                                             
      pty.write(msg.toString());  // ← INJECT INTO CLAUDE'S STDIN
    });                                                                                                                                    
  });                                                                                                                                      
  socket.listen(`/tmp/claude-${process.pid}.sock`);                                                                                        
                                                                                                                                           
  # daemon injects message                                                                                                                 
  echo "check .agent/.comms/inbox" | nc -U /tmp/claude-12345.sock                                                                          
                                  
  Why This Works                                                                                                                           
                                                                                                                                           
  ┌─────────────┬─────────────────────────────────────┐
  │    layer    │            who controls             │                                                                                    
  ├─────────────┼─────────────────────────────────────┤
  │ PTY master  │ our wrapper (not terminal emulator) │                                                                                  
  ├─────────────┼─────────────────────────────────────┤                                                                                    
  │ PTY slave   │ claude sees as stdin/stdout         │
  ├─────────────┼─────────────────────────────────────┤                                                                                    
  │ unix socket │ daemon can write to                 │                                                                                    
  └─────────────┴─────────────────────────────────────┘
                                                                                                                                           
  We've inserted ourselves between the terminal and claude, gaining write access to claude's "stdin".                                      
                                                                                                                                         
  No tmux Required                                                                                                                         
                                  
  This is what tmux/screen do internally — they hold the PTY master. We're just doing it directly for a single process.                    
                                                                                                                                         
  Tradeoffs                                                                                                                                
                                  
  ┌────────────────────────┬─────────────────────────────────────────────┐                                                                 
  │          pro           │                     con                     │
  ├────────────────────────┼─────────────────────────────────────────────┤
  │ direct stdin injection │ wrapper process must stay alive             │
  ├────────────────────────┼─────────────────────────────────────────────┤
  │ no tmux dependency     │ need node-pty or similar                    │
  ├────────────────────────┼─────────────────────────────────────────────┤                                                               
  │ clean IPC via socket   │ slightly more complex than raw claude       │                                                                 
  ├────────────────────────┼─────────────────────────────────────────────┤                                                                 
  │ works on any terminal  │ signal handling (SIGWINCH, etc.) needs care │                                                                 
  └────────────────────────┴─────────────────────────────────────────────┘                                                                 
                                                                                                                                         
  The Pattern                                                                                                                              
                                  
  rhx enroll claude becomes the "blessed" entry point that:                                                                                
  1. creates PTY pair                                                                                                                    
  2. spawns claude on slave                                                                                                                
  3. relays stdin/stdout          
  4. listens for daemon injections                                                                                                         
                                                                                                                                         
  Direct claude invocation still works, just without push capability.                                                                      
                                  
  This feels cleaner than the hook+exit(2) approach?                                                                                       
                                                                                                                                           
✻ Sautéed for 1m 8s                                                                                                                        
                                                                                                                                           
❯ i.e., create a IPC channel ourselves?                                                                                                    
                                                                                                                                         
● Exactly. The PTY master is the IPC channel.                                                                                              
                                                                                                                                         
  The Options                                                                                                                              
                                  
  ┌───────────────────┬─────────────────────────────┬─────────────────────┐                                                                
  │     approach      │        IPC mechanism        │     complexity      │
  ├───────────────────┼─────────────────────────────┼─────────────────────┤                                                                
  │ PTY wrapper       │ PTY master fd + unix socket │ medium              │
  ├───────────────────┼─────────────────────────────┼─────────────────────┤
  │ named pipe (FIFO) │ mkfifo, tee stdin           │ simpler but fragile │                                                                
  ├───────────────────┼─────────────────────────────┼─────────────────────┤                                                                
  │ shared fd         │ pass fd via unix socket     │ complex             │                                                                
  ├───────────────────┼─────────────────────────────┼─────────────────────┤                                                                
  │ tmux              │ tmux's internal IPC         │ external dep        │
  └───────────────────┴─────────────────────────────┴─────────────────────┘                                                                
                  
  Simplest Version: Named Pipe                                                                                                             
                  
  # rhx enroll claude (bash version)
  PIPE="/tmp/claude-$$.pipe"                                                                                                               
  mkfifo "$PIPE"
                                                                                                                                           
  # merge: user stdin + daemon pipe → claude stdin
  cat "$PIPE" &                                                                                                                            
  exec claude --resume < <(cat "$PIPE" & cat)                                                                                              
                                                                                                                                           
  # daemon pushes                                                                                                                          
  echo "check inbox" > /tmp/claude-12345.pipe                                                                                              
                                                                                                                                           
  But this is fragile — pipe EOF handling, blocking, etc.                                                                                  
                                                                                                                                           
  Robust Version: PTY + Socket                                                                                                             
                  
  user stdin ──┐                                                                                                                           
               ├──► PTY master ──► PTY slave ──► claude stdin
  daemon ──────┘                                                                                                                           
      (via unix socket)                                                                                                                    
                                                                                                                                           
  The wrapper multiplexes two input sources onto one PTY master.                                                                           
                  
  What We're Really Building                                                                                                               
                  
  ┌─────────────────────────────┐                                                                                                          
  │  rhx enroll claude          │
  │                             │
  │  ┌───────────┐ ┌─────────┐  │
  │  │ stdin mux │ │ socket  │  │                                                                                                          
  │  └─────┬─────┘ └────┬────┘  │                                                                                                          
  │        │            │       │                                                                                                          
  │        └──────┬─────┘       │                                                                                                          
  │               ▼             │
  │        ┌───────────┐        │                                                                                                          
  │        │ PTY master│        │
  │        └─────┬─────┘        │                                                                                                          
  │              │              │
  │        ┌─────▼─────┐        │                                                                                                          
  │        │  claude   │        │
  │        └───────────┘        │                                                                                                          
  └─────────────────────────────┘
                                                                                                                                           
  It's a mini terminal emulator that:
  1. relays stdin/stdout (transparent to user)                                                                                             
  2. accepts daemon writes (invisible to user)                                                                                             
  3. injects daemon messages as if user typed them
                                                                                                                                           
  Registry                                                                                                                                 
   
  Daemon needs to find the socket:                                                                                                         
                  
  .agent/.registry/clones/                                                                                                                 
    └── <clone-id>.json                                                                                                                    
        {                                                                                                                                  
          "pid": 12345,                                                                                                                    
          "socket": "/tmp/rhx-claude-12345.sock",                                                                                          
          "roles": ["mechanic", "driver"],
          "startedAt": "2026-04-12T..."                                                                                                    
        }                                                                                                                                  
                                                                                                                                           
  Daemon watches .comms/, filters by role, writes to matching socket.                                                                      
                  
  This is the clean version of your wish — real IPC instead of exit(2) hacks.                                                              
                  
✻ Cogitated for 49s                                                                                                                        
                  
❯ sweet. why dont we call it `.agent/.sockets/for.actor=$xyz` ? create a `.pivot.md` file into .behavior/v2026_04_09.brain-hook-on-push    
                                                                                                                                        
  Read 1 file (ctrl+o to expand)                                                                                                           
                                      
