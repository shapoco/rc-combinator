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
      (capacitor: boolean, values: VectorDouble, target_value: number,
       max_elements: number, topology_constraint: number,
       max_depth: number) => string;
  find_dividers:
      (values: VectorDouble, target_ratio: number, total_min: number,
       total_max: number, max_elements: number, topology_constraint: number,
       max_depth: number) => string;
  VectorDouble: new() => VectorDouble;
  //_malloc: (size: number) => number;
  //_free: (ptr: number) => void;
  // HEAPU8: Uint8Array;
  // locateFile?: (path: string) => string;
  // 必要に応じて他のプロパティを追加
}
declare function createModule(moduleOverrides?: any): Promise<RccombCore>;

export {RccombCore, VectorDouble};
export default createModule;
