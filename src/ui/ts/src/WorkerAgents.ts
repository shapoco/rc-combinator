import {WorkerCommand} from '../../../lib/ts/src/RcmbJS';

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