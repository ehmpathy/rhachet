/**
 * .what = the path a file is read from, where it is read from its own path
 * .why = a role read as it lies on disk holds each file's bytes at the path the walk listed
 */
export const asPathItself = (path: string): string => path;
