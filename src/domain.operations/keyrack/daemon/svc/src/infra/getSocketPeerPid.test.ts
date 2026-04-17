import { given, then, when } from 'test-fns';

/**
 * .what = unit tests for signed/unsigned inode conversion
 * .why = prove the fix for socket inode lookup when inode > 2^31
 *
 * .note = the actual getSocketPeerPid function requires live sockets
 * .note = these tests validate the math used in the signed conversion
 */
describe('getSocketPeerPid signed/unsigned conversion', () => {
  const INT32_MAX = 2147483647; // 2^31 - 1
  const UINT32_MAX = 4294967296; // 2^32

  /**
   * .what = convert unsigned inode to signed 32-bit representation
   * .why = ss -xp displays socket identifiers as signed 32-bit integers
   */
  const asSignedInode = (unsignedInode: number): number =>
    unsignedInode > INT32_MAX ? unsignedInode - UINT32_MAX : unsignedInode;

  given('[case1] inode below INT32_MAX (positive in both)', () => {
    when('[t0] inode is 12345', () => {
      then('signed representation is same as unsigned', () => {
        expect(asSignedInode(12345)).toBe(12345);
      });
    });

    when('[t1] inode is exactly INT32_MAX', () => {
      then('signed representation is same as unsigned', () => {
        expect(asSignedInode(INT32_MAX)).toBe(INT32_MAX);
      });
    });
  });

  given('[case2] inode above INT32_MAX (negative in signed)', () => {
    when('[t0] inode from POC: 2367234854', () => {
      // from refs/poc.root-cause-investigation.md
      // unsigned: 2367234854
      // signed: 2367234854 - 4294967296 = -1927732442
      then('signed representation is negative', () => {
        expect(asSignedInode(2367234854)).toBe(-1927732442);
      });
    });

    when('[t1] inode from POC: 2365553034', () => {
      // from refs/poc.root-cause-investigation.md
      // unsigned: 2365553034
      // signed: 2365553034 - 4294967296 = -1929414262
      then('signed representation matches ss output', () => {
        expect(asSignedInode(2365553034)).toBe(-1929414262);
      });
    });

    when('[t2] inode just above INT32_MAX', () => {
      // INT32_MAX + 1 = 2147483648
      // signed: 2147483648 - 4294967296 = -2147483648
      then('wraps to minimum signed value', () => {
        expect(asSignedInode(INT32_MAX + 1)).toBe(-2147483648);
      });
    });

    when('[t3] inode at UINT32_MAX - 1', () => {
      // 4294967295 (max unsigned 32-bit)
      // signed: 4294967295 - 4294967296 = -1
      then('wraps to -1', () => {
        expect(asSignedInode(UINT32_MAX - 1)).toBe(-1);
      });
    });
  });

  given('[case3] grep pattern generation', () => {
    /**
     * .what = generate grep pattern for inode lookup
     * .why = must match either unsigned or signed representation
     */
    const asGrepPattern = (inode: string): string => {
      const inodeNum = parseInt(inode, 10);
      const signedInode = asSignedInode(inodeNum);
      return inodeNum > INT32_MAX ? `(${inode}|${signedInode})` : inode;
    };

    when('[t0] inode below INT32_MAX', () => {
      then('pattern is just the inode', () => {
        expect(asGrepPattern('12345')).toBe('12345');
      });
    });

    when('[t1] inode above INT32_MAX', () => {
      then('pattern includes both unsigned and signed', () => {
        expect(asGrepPattern('2367234854')).toBe('(2367234854|-1927732442)');
      });
    });
  });
});
