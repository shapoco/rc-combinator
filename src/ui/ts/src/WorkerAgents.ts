export class WorkerAgent {
  worker: Worker|null = null;
  workerRunning = false;

  startRequestParams: any = {};
  startRequestTimerId: number|null = null;

  lastLaunchedParams: any = {};

  onFinished: ((e: any) => void)|null = null;
  onAborted: ((msg: string) => void)|null = null;

  requestStart(p: any): void {
    if (JSON.stringify(p) === JSON.stringify(this.startRequestParams)) {
      return;
    }

    this.cancelRequest();
    this.startRequestParams = p;
    this.startRequestTimerId = window.setTimeout(async () => {
      this.startRequestTimerId = null;
      await this.startWorker();
    }, 100);
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
      console.log('Starting worker...');
      this.worker = new Worker('../worker/index.mjs?12345678', {type: 'module'});
      console.log('Worker started.');
      this.worker.onmessage = (e) => this.onMessaged(e);
      this.worker.onerror = (e) => this.onError(e.message);
      this.worker.onmessageerror = (e) => this.onError('Message error in worker');
      console.log('Worker event handlers set.');
    }

    this.lastLaunchedParams = JSON.parse(JSON.stringify(this.startRequestParams));
    console.log('Posting message to worker:', this.startRequestParams);
    this.worker.postMessage(this.startRequestParams);
    console.log('Message posted.');
    this.workerRunning = true;
  }

  abortWorker(): void {
    if (this.worker !== null) {
      this.worker!.terminate();
      this.worker = null;
    }
    this.workerRunning = false;
  }

  onMessaged(e: MessageEvent<any>): void {
    this.workerRunning = false;
    if (this.onFinished) {
      let ret = e.data;
      ret.params = this.lastLaunchedParams;
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