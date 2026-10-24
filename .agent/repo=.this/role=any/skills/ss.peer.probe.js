/**
 * .what = open a real unix socket pair and report what `ss -xp` shows for both inodes
 * .why = the clone socket's same-user auth reads the peer pid from `ss -xp`; when it
 *        refuses ("could not read peer pid from ss"), this shows the raw lines, the
 *        ss version and the call's wall time, so the cause is measured, not guessed
 */
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const runSs = (args) =>
  new Promise((done) => {
    const since = Date.now();
    execFile('ss', args, { encoding: 'utf-8', timeout: 20000, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) =>
      done({ ms: Date.now() - since, stdout: stdout ?? '', stderr: stderr ?? '', error: error ? String(error.message).split('\n')[0] : null }),
    );
  });

const inodeOf = (socket) => {
  const fd = socket._handle && socket._handle.fd;
  const link = fs.readlinkSync(`/proc/self/fd/${fd}`);
  return link.match(/socket:\[(\d+)\]/)[1];
};

// optional cpu ballast: `--busy N` spins N children on a busy loop, so each wall time below is
// read on a saturated host — the load the full integration sweep puts on this box
const busyArg = process.argv.indexOf('--busy');
const busyCount = busyArg > -1 ? parseInt(process.argv[busyArg + 1], 10) : 0;
const busyKids = Array.from({ length: busyCount }, () =>
  require('node:child_process').spawn(process.execPath, ['-e', 'for(;;){}'], { stdio: 'ignore' }),
);
process.on('exit', () => busyKids.forEach((kid) => kid.kill('SIGKILL')));

const main = async () => {
  if (busyCount) await new Promise((done) => setTimeout(done, 2000));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-peer-probe-'));
  const sockPath = path.join(dir, 'probe.sock');
  const server = net.createServer();
  await new Promise((done) => server.listen(sockPath, done));
  const accepted = new Promise((done) => server.once('connection', done));
  const client = net.connect(sockPath);
  await new Promise((done) => client.once('connect', done));
  const serverSide = await accepted;

  const inodeServer = inodeOf(serverSide);
  const inodeClient = inodeOf(client);
  const version = await runSs(['-V']);
  const bare = await runSs(['-x']);
  console.log(`ss -x wall     = ${bare.ms}ms (no process map)`);
  const { exec } = require('node:child_process');
  const viaShell = await new Promise((done) => {
    const since = Date.now();
    exec(`ss -x | grep -E "${inodeOf(serverSide)}" || true`, () => done(Date.now() - since));
  });
  console.log(`sh+ss+grep     = ${viaShell}ms (the shell pipeline form)`);
  console.log(`load           = ${fs.readFileSync('/proc/loadavg', 'utf8').trim()}`);
  const full = await runSs(['-xp']);
  const lines = full.stdout.split('\n');
  const hits = lines.filter((line) => line.split(/\s+/).some((t) => t === inodeServer || t === inodeClient));

  console.log(`ss version     = ${version.stdout.trim() || version.stderr.trim()}`);
  console.log(`ss -xp wall    = ${full.ms}ms · ${lines.length} lines · error = ${full.error}`);
  console.log(`lines w/o pid  = ${lines.filter((l) => l.trim() && !/pid=/.test(l)).length}`);
  console.log(`self pid       = ${process.pid}`);
  console.log(`inode server   = ${inodeServer} · inode client = ${inodeClient}`);
  console.log(`matched lines  = ${hits.length}`);
  for (const hit of hits) console.log(`  ${hit.replace(/\s+/g, ' ').trim()}`);
  if (full.stderr.trim()) console.log(`ss stderr      = ${full.stderr.trim().split('\n')[0]}`);

  client.destroy();
  serverSide.destroy();
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });

  // the ballast children hold the event loop open, so end them and exit explicitly
  busyKids.forEach((kid) => kid.kill('SIGKILL'));
  process.exit(0);
};

main();
