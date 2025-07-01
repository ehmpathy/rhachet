import { DomainLiteral } from 'domain-objects';

export interface Stitch<TOutput> {
  // todo: some way to tie back to the stitcher + thread invocation that produced it? (i.e., the route step)
  // todo: some declaration of invalidation triggers? (or is that assumption based)
  // todo: some exid to distinctly refer to it? i.e., how will dependencies be declared?
  output: TOutput;
}

export class Stitch<TOutput>
  extends DomainLiteral<Stitch<TOutput>>
  implements Stitch<TOutput> {}
