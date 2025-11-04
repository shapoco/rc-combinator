import {WorkerCommand} from '../../../../lib/ts/src/RcmbJS';

export class WorkerAgent {
  urlPostfix = Math.floor(Date.now() / (60 * 1000)).toString();

  worker: Worker|null = null;
  workerRunning = false;

  startRequestCommand: WorkerCommand|null = null;
  startRequestTimerId: number|null = null;

  lastLaunchedCommand: WorkerCommand|null = null;

  onLaunched: ((cmd: WorkerCommand) => void)|null = null;
  onFinished: ((e: any) => void)|null = null;
  onAborted: ((msg: string) => void)|null = null;

  requestStart(cmd: WorkerCommand): boolean {
    if (JSON.stringify(cmd) === JSON.stringify(this.startRequestCommand)) {
      return this.workerRunning;
    }

    this.cancelRequest();
    this.startRequestCommand = cmd;
    this.startRequestTimerId = window.setTimeout(async () => {
      this.startRequestTimerId = null;
      await this.startWorker();
    }, 100);

    return true;
  }

  cancelRequest(): void {
    if (this.startRequestTimerId !== null) {
      window.clearTimeout(this.startRequestTimerId);
      this.startRequestTimerId = null;
    }
  }

  async startWorker(): Promise<void> {
    this.abortWorker();

    if (this.worker === null) {
      const baseUrl =
          (window.location.hostname === 'localhost') ? '' : '/rc-combinator';
      const workerUrl = `${baseUrl}/worker/index.mjs?${this.urlPostfix}`;
      console.log(`Launching worker: '${workerUrl}'`);
      this.worker = new Worker(workerUrl, {type: 'module'});
      console.log('Worker started.');
      this.worker.onmessage = (e) => this.onMessaged(e);
      this.worker.onerror = (e) => this.onError(e.message);
      this.worker.onmessageerror = (e) =>
          this.onError('Message error in worker');
    }

    const cmd = this.startRequestCommand!;
    this.lastLaunchedCommand = JSON.parse(JSON.stringify(cmd));
    this.worker.postMessage(cmd);
    this.workerRunning = true;

    if (this.onLaunched) {
      this.onLaunched(this.lastLaunchedCommand!);
    }
  }

  abortWorker(): void {
    if (!this.workerRunning) return;
    console.log('Aborting worker...');
    if (this.worker !== null) {
      try {
        this.worker!.terminate();
      } catch (e) {
        console.error('Failed to terminate worker:', e);
      }
      this.worker = null;
    }
    this.workerRunning = false;
  }

  onMessaged(e: MessageEvent<any>): void {
    this.workerRunning = false;
    if (this.onFinished) {
      let ret = e.data;
      ret.command = this.lastLaunchedCommand;
      if (ret.meta) {
        const meta = ret.meta;
        // if (meta.topologyCountList) {
        //   const numTopoList = meta.topologyCountList as number[];
        //   let totalTopos = 0;
        //   for (let i = 0; i < numTopoList.length; i++) {
        //     totalTopos += numTopoList[i];
        //   }
        //   console.log(`Total number of topologies: ${totalTopos}`);
        // }
        if (meta.numTopologies !== undefined) {
          console.log(
              `Number of entry of topology cache: ${meta.numTopologies}`);
        }
        // if (meta.numCombinations !== undefined) {
        //   console.log(`Number of combination objects:
        //   ${meta.numCombinations}`);
        // }
        // if (meta.numSearchStates !== undefined) {
        //   console.log(
        //       `Number of search state objects: ${meta.numSearchStates}`);
        // }
        if (meta.heapSize) {
          console.log(`Worker heap size: ${meta.heapSize / 1024 / 1024} MB`);
        }
      }
      this.onFinished(ret);
    }
    if (this.startRequestTimerId !== null) {
      window.clearTimeout(this.startRequestTimerId);
      this.startRequestTimerId = null;
      this.startWorker();
    }
  }

  onError(msg: string): void {
    this.abortWorker();
    if (this.onAborted) {
      this.onAborted(msg);
    }
  }
}