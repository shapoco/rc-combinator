declare interface VectorDouble {
  push_back: (value: number) => void;
  delete: () => void;
}
declare interface RccombCore {
  ccall:
      (ident: string, returnType: string|null, argTypes: string[]|null,
       args?: any[]) => any;
  cwrap:
      (ident: string, returnType: string|null,
       argTypes: string[]|null) => (...args: any[]) => any;
  find_combinations:
      (capacitor: boolean, values: VectorDouble, targetValue: number,
       maxElements: number) => string;
  VectorDouble: new () => VectorDouble;
  //_malloc: (size: number) => number;
  //_free: (ptr: number) => void;
  // HEAPU8: Uint8Array;
  // locateFile?: (path: string) => string;
  // 必要に応じて他のプロパティを追加
}
declare function createModule(moduleOverrides?: any): Promise<RccombCore>;

export {RccombCore, VectorDouble};
export default createModule;
