export class WorkerAgent {
  urlPostfix = Math.floor(Date.now() / (1000 * 60)).toString();

  worker: Worker|null = null;
  workerRunning = false;

  startRequestParams: any = {};
  startRequestTimerId: number|null = null;

  lastLaunchedParams: any = {};

  onFinished: ((e: any) => void)|null = null;
  onAborted: ((msg: string) => void)|null = null;

  requestStart(p: any): boolean {
    if (JSON.stringify(p) === JSON.stringify(this.startRequestParams)) {
      return false;
    }

    this.cancelRequest();
    this.startRequestParams = p;
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

    this.lastLaunchedParams =
        JSON.parse(JSON.stringify(this.startRequestParams));
    this.worker.postMessage(this.startRequestParams);
    this.workerRunning = true;
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