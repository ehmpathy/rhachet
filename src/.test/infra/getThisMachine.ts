import * as os from 'os';

/**
 * .what = the names this machine goes by: its home dir, its username, its hostname
 * .why = the machine-name scan (`getAllMachineNamesInText`) needs all three, read the same way
 *        at every call site, so a test that scans committed config never forgets one
 */
export const getThisMachine = (): {
  home: string;
  username: string;
  hostname: string;
} => ({
  home: os.homedir(),
  username: os.userInfo().username,
  hostname: os.hostname(),
});
