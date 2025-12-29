interface PipelineContract {
	from(target: any): this;
	through(...pipes: any[]): this;
	then(destination: (target: any) => any): any;
	viaMethod(method: string): this;
}

export class Pipeline<F = any> implements PipelineContract {
	protected target: F | null = null;
	protected pipes: any[] = [];
	protected method: string = 'handle';

	public from(target: F): this {
		this.target = target;
		return this;
	}

	public through(...pipes: any[]): this {
		pipes.forEach((pipe) => {
			this.pipes.push(pipe);
		});

		return this;
	}

	public add(pipe: any) {
		this.pipes.push(pipe);

		return this;
	}

	public then(destination: (target: any) => any): any {
		const pipeline = this.pipes.reverse().reduce(this.carryPipes(), this.prepareDestination(destination));

		return pipeline(this.target);
	}

	public viaMethod(method: string): this {
		this.method = method;

		return this;
	}

	protected prepareDestination(destination: (target: any) => any): (target: any) => any {
		return (target: any) => {
			try {
				return destination(target);
			} catch (e) {
				return this.handleException(target, e as Error);
			}
		};
	}

	protected carryPipes(): (stack: (target: any) => any, pipe: any) => (target: any) => any {
		return (stack: (target: any) => any, pipe: any) => {
			return (target: any) => {
				try {
					if (typeof pipe === 'function') {
						return pipe(target, stack);
					} else if (typeof pipe === 'object' && pipe !== null) {
						const params = [target, stack];
						return this.method in pipe ? pipe[this.method](...params) : pipe(...params);
					} else {
						throw new Error(`Invalid pipe type: ${typeof pipe}`);
					}
				} catch (e) {
					return this.handleException(target, e as Error);
				}
			};
		};
	}

	protected handleCarry(carry: any): any {
		return carry;
	}

	protected handleException(target: any, e: Error): any {
		throw e;
	}
}
