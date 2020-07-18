// eslint-disable-next-line @typescript-eslint/naming-convention
import worker_threads = require('worker_threads');

interface IWorkerQueueItem<T> {
	resolve: PromiseResolve<T>;
	messageNumber: number;
}

export abstract class WorkerBase<WorkerData, MessageId, ThreadResponse, WorkerNames = string> {
	abstract threadPath: string;

	isBusy: boolean = false;
	workerData: WorkerData | undefined = undefined;
	workerNames: WorkerNames[] | undefined = undefined;

	// eslint-disable-next-line @typescript-eslint/naming-convention
	protected workers: worker_threads.Worker[] | undefined = undefined;

	private messageNumber: number = 0;
	private messageQueue: IWorkerQueueItem<ThreadResponse>[] = [];
	private sendMessages: boolean = true;
	private unrefTimer: NodeJS.Timer | undefined = undefined;

	abstract loadData(): WorkerData;

	async sendMessage(id: MessageId, message: string, workerNumber?: number): Promise<ThreadResponse | null> {
		if (!this.sendMessages) return Promise.resolve(null);

		this.init();

		if (workerNumber) {
			if (!this.workerNames) throw new Error("Worker number passed to sendMessage() for a single worker");
			if (workerNumber < 0 || workerNumber > this.workerNames.length - 1) {
				throw new Error("Invalid worker number passed to sendMessage()");
			}
		} else {
			workerNumber = this.workerNames ? Tools.random(this.workerNames.length) : 0;
		}

		this.isBusy = true;

		return (new Promise(resolve => {
			this.messageNumber++;
			this.messageQueue.push({resolve, messageNumber: this.messageNumber});
			this.workers![workerNumber!].postMessage(this.messageNumber + "|" + id + "|" + message);
		}));
	}

	init(): void {
		if (!this.workerData) this.workerData = this.loadData();
		if (!this.workers) {
			this.workers = [];

			let numberOfWorkers: number;
			if (this.workerNames) {
				numberOfWorkers = this.workerNames.length;
			} else {
				numberOfWorkers = 1;
			}

			for (let i = 0; i < numberOfWorkers; i++) {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				const worker = new worker_threads.Worker(this.threadPath, {workerData: this.workerData});

				worker.on('message', (message: string) => {
					const parts = message.split("|");
					const requestNumber = parseInt(parts[0]);
					for (let i = 0; i < this.messageQueue.length; i++) {
						if (this.messageQueue[i].messageNumber === requestNumber) {
							const request = this.messageQueue.splice(i, 1)[0];
							// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
							let result = JSON.parse(parts.slice(2).join("|"));
							if (result === "") result = null;
							request.resolve(result);
							break;
						}
					}

					this.isBusy = !!this.messageQueue.length;
				});

				worker.on('error', e => console.log(e));

				worker.on('exit', code => {
					if (code !== 0) {
						console.log(new Error(`Worker stopped with exit code ${code}`));
					}
				});

				this.workers.push(worker);
			}
		}
	}

	unref(): void {
		this.sendMessages = false;

		if (this.messageQueue.length) {
			this.unrefTimer = setTimeout(() => this.unref(), 1000);
			return;
		}

		if (this.unrefTimer) {
			clearTimeout(this.unrefTimer);
			delete this.unrefTimer;
		}

		if (this.workers) {
			for (const worker of this.workers) {
				worker.unref();
			}
			delete this.workers;
		}

		// @ts-expect-error
		delete this.messageQueue;
		delete this.workerData;
		delete this.workerNames;
	}
}
