declare interface VectorDouble {
  push_back: (value: number) => void;
  delete: () => void;
}
declare interface RcmbWasm {
  ccall:
      (ident: string, returnType: string|null, argTypes: string[]|null,
       args?: any[]) => any;
  cwrap:
      (ident: string, returnType: string|null,
       argTypes: string[]|null) => (...args: any[]) => any;
  findCombinations:
      (capacitor: boolean, element_values: VectorDouble, max_elements: number,
       topology_constraint: number, max_depth: number, target_value: number,
       target_min: number, target_max: number) => string;
  findDividers:
      (values: VectorDouble, max_elements: number, topology_constraint: number,
       max_depth: number, total_min: number, total_max: number,
       target_value: number, target_min: number, target_max: number) => string;
  VectorDouble: new() => VectorDouble;
}
declare function createRcmbWasm(moduleOverrides?: any): Promise<RcmbWasm>;

export {RcmbWasm, VectorDouble};
export default createRcmbWasm;
