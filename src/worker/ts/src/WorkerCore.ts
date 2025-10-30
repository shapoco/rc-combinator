import createRcmbWasm from '../../../lib/cpp_wasm/build/rcmb_wasm';
import * as RcmbJS from '../../../lib/ts/src/RcmbJS';
import * as RcmbWasm from '../../../lib/ts/src/RcmbWasm';

let wasmCore: RcmbWasm.RcmbWasm|null = null;

declare interface DedicatedWorkerGlobalScope {
  onmessage: (e: MessageEvent<any>) => Promise<any>;
  postMessage: (message: any) => void;
}

const thisWorker = self as DedicatedWorkerGlobalScope;

// onmessage
thisWorker.onmessage = async (e: MessageEvent<any>) => {
  const args = e.data;
  const useWasm = args.useWasm as boolean;
  if (useWasm) {
    if (!wasmCore) {
      console.log('Loading WASM module...');
      wasmCore = (await createRcmbWasm()) as RcmbWasm.RcmbWasm;
      console.log('WASM module loaded.');
    }
  }

  const capacitor = args.capacitor as boolean;
  const method = args.method as RcmbJS.Method;
  const values = args.values as number[];
  const maxElements = args.maxElements as number;
  const topologyConstraint =
      args.topologyConstraint as RcmbJS.TopologyConstraint;
  const maxDepth = args.maxDepth as number;

  let ret = {
    error: '',
    result: [],
    timeSpent: 0,
  };

  const start = performance.now();

  switch (method) {
    case RcmbJS.Method.FindCombination: {
      const targetValue = args.targetValue as number;
      if (useWasm) {
        const vec = new wasmCore!.VectorDouble();
        for (const v of values) {
          vec.push_back(v);
        }
        const retStr = wasmCore!.findCombinations(
            capacitor, vec, targetValue, maxElements, topologyConstraint,
            maxDepth);
        vec.delete();
        ret = JSON.parse(retStr);
      } else {
        ret = RcmbJS.findCombinations(
            capacitor, values, targetValue, maxElements, topologyConstraint,
            maxDepth);
      }
    } break;

    case RcmbJS.Method.FindDivider: {
      const targetRatio = args.targetRatio as number;
      const totalMin = args.totalMin as number;
      const totalMax = args.totalMax as number;
      if (useWasm) {
        const vec = new wasmCore!.VectorDouble();
        for (const v of values) {
          vec.push_back(v);
        }
        const retStr = wasmCore!.findDividers(
            vec, targetRatio, totalMin, totalMax, maxElements,
            topologyConstraint, maxDepth);
        vec.delete();
        ret = JSON.parse(retStr);
      }
      else {
        ret = RcmbJS.findDividers(
            values, targetRatio, totalMin, totalMax, maxElements,
            topologyConstraint, maxDepth);
      }
    } break;

    default:
      ret.error = 'Invalid method';
      break;
  }

  const end = performance.now();
  ret.timeSpent = end - start;

  thisWorker.postMessage(ret);
};
