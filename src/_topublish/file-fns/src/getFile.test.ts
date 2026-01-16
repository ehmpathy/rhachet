import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { getFile } from './getFile';

describe('getFile', () => {
  given('[case1] file found', () => {
    const scene = useBeforeAll(async () => {
      const filePath = path.join(os.tmpdir(), `getfile-test-${Date.now()}.txt`);
      await fs.writeFile(filePath, 'hello world', 'utf-8');
      return { filePath };
    });

    when('[t0] read is called', () => {
      then('returns file contents', async () => {
        const content = await getFile({ path: scene.filePath });
        expect(content).toEqual('hello world');
      });
    });
  });

  given('[case2] file not found', () => {
    when('[t0] read is called', () => {
      then('throws error', async () => {
        await expect(
          getFile({ path: '/nonexistent/path/file.txt' }),
        ).rejects.toThrow();
      });
    });
  });

  given('[case3] relative path', () => {
    const scene = useBeforeAll(async () => {
      const fileName = `getfile-test-${Date.now()}.txt`;
      const filePath = path.join(process.cwd(), fileName);
      await fs.writeFile(filePath, 'relative content', 'utf-8');
      return { fileName, filePath };
    });

    afterAll(async () => {
      await fs.rm(scene.filePath, { force: true });
    });

    when('[t0] read is called with relative path', () => {
      then('resolves and returns file contents', async () => {
        const content = await getFile({ path: scene.fileName });
        expect(content).toEqual('relative content');
      });
    });
  });
});
