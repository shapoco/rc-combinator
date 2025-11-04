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
  let ret = {
    error: '',
    result: [],
    timeSpent: 0,
  };

  try {
    const cmd = e.data;
    const method = cmd.method as RcmbJS.Method;

    if (!wasmCore) {
      console.log('Loading WASM module...');
      wasmCore = (await createRcmbWasm()) as RcmbWasm.RcmbWasm;
      console.log('WASM module loaded.');
    }

    const start = performance.now();
    switch (method) {
      case RcmbJS.Method.FindCombination: {
        const args = cmd.args as RcmbJS.FindCombinationArgs;
        const elementValues = new wasmCore!.VectorDouble();
        for (const v of args.elementValues) {
          elementValues.push_back(v);
        }
        const retStr = wasmCore!.findCombinations(
            args.capacitor, elementValues, args.numElemsMin, args.numElemsMax,
            args.topologyConstraint, args.maxDepth, args.targetValue,
            args.targetMin, args.targetMax);
        elementValues.delete();
        ret = JSON.parse(retStr);
      } break;

      case RcmbJS.Method.FindDivider: {
        const args = cmd.args as RcmbJS.FindDividerArgs;
        const elementValues = new wasmCore!.VectorDouble();
        for (const v of args.elementValues) {
          elementValues.push_back(v);
        }
        const retStr = wasmCore!.findDividers(
            elementValues, args.numElemsMin, args.numElemsMax,
            args.topologyConstraint, args.maxDepth, args.totalMin,
            args.totalMax, args.targetValue, args.targetMin, args.targetMax);
        elementValues.delete();
        ret = JSON.parse(retStr);
      } break;

      default:
        ret.error = 'Invalid method';
        break;
    }

    const end = performance.now();
    ret.timeSpent = end - start;
  } catch (err: any) {
    ret.error = (err && err.message) ? err.message : String(err);
  }

  thisWorker.postMessage(ret);
};
