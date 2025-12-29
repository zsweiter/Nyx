import 'reflect-metadata';

export type ServiceIdentifier<T = any> = string | symbol | number | (new (...args: any[]) => T) | T;

export type Factory<T> = (container: Container) => T;
export type Provider<T> =
	| Factory<T>
	| T
	| (new (...args: any[]) => T)
	| {
			token: ServiceIdentifier<T>;
			useFactory: Factory<T>;
			inject: ServiceIdentifier[];
	  };

interface Binding<T = any> {
	provider: Provider<T>;
	shared: boolean; // true = singleton
	scope?: 'singleton' | 'transient' | 'request';
}

export interface ContainerOptions {
	strict?: boolean; // Si true, lanza error si no encuentra dependencia
	autoBinding?: boolean; // Si true, auto-registra clases no encontradas
}

export class Container {
	private bindings = new Map<string | symbol | number, Binding>();
	private instances = new Map<string | symbol | number, any>();
	private resolutionCache = new Map<Function, { paramTypes: any[]; hasDefault: boolean[] }>();
	private resolutionStack: string[] = []; // Para detectar dependencias circulares
	private parent?: Container;
	private children: Container[] = [];
	private options: ContainerOptions;

	constructor(options: ContainerOptions = {}) {
		this.options = {
			strict: true,
			autoBinding: false,
			...options,
		};
	}

	private normalizeId(id: ServiceIdentifier): string | symbol | number {
		if (typeof id === 'function') {
			return id.name;
		}
		if (typeof id === 'object' && id?.constructor?.name) {
			return id.constructor.name;
		}

		return id;
	}

	private _set<T>(id: ServiceIdentifier<T>, provider: Provider<T>, shared: boolean): void {
		const norm = this.normalizeId(id);

		if (this.bindings.has(norm)) {
			console.warn(`[Container] Warning: service ${String(norm)} already registered, overwriting.`);
		}

		this.bindings.set(norm, { provider, shared });

		// Si es una instancia directa, guardarla como singleton
		if (typeof provider !== 'function' && typeof provider !== 'object' && shared) {
			this.instances.set(norm, provider);
		}
	}

	public bind<T>(id: ServiceIdentifier<T>, factory: Factory<T>): this {
		this._set(id, factory, false);
		return this;
	}

	public singleton<T>(id: ServiceIdentifier<T>, provider: Provider<T>): this {
		this._set(id, provider, true);
		return this;
	}

	public transient<T>(id: ServiceIdentifier<T>, provider: Provider<T>): this {
		this._set(id, provider, false);
		return this;
	}

	public setIfNotExists<T>(id: ServiceIdentifier<T>, provider: Provider<T>): this {
		const _id = this.normalizeId(id);
		if (!this.bindings.has(_id)) {
			this._set(_id, provider, true);
		}
		return this;
	}

	public set<T>(id: ServiceIdentifier<T> | Provider<T>, maybeProvider?: Provider<T>): this {
		if (maybeProvider) {
			this._set(id as ServiceIdentifier<T>, maybeProvider, true);
		} else {
			const provider = id as Provider<T>;

			if (typeof provider === 'function') {
				if (this.isClass(provider)) {
					this._set(provider as any, provider, true);
				} else {
					const idSym = Symbol('factory');
					this._set(idSym, provider as any, true);
				}
			} else if (provider && typeof provider === 'object' && 'token' in provider) {
				const config = provider as any;
				this._set(config.token, config.useFactory, true);
			} else {
				const idAuto = (provider as any)?.constructor?.name ?? Symbol('instance');
				this._set(idAuto, provider, true);
			}
		}
		return this;
	}

	public get<T>(id: ServiceIdentifier<T>): T {
		const norm = this.normalizeId(id);
		const key = String(this.normalizeId(norm));

		if (this.resolutionStack.includes(key)) {
			throw new Error(`Circular dependency detected: ${this.resolutionStack.join(' -> ')} -> ${key}`);
		}

		try {
			this.resolutionStack.push(key);

			if (this.instances.has(norm)) {
				return this.instances.get(norm);
			}

			if (this.bindings.has(norm)) {
				return this.resolveBinding(norm);
			}

			if (this.parent) {
				try {
					return this.parent.get(id);
				} catch (e: any) {
					console.warn(`[Container] Warning: ${e.message}`);
				}
			}

			if (this.options.autoBinding && typeof id === 'function' && this.isClass(id)) {
				this.singleton(id, id);
				return this.resolveBinding(norm);
			}

			if (typeof id === 'function' && this.isClass(id)) {
				return this.instantiate(id as any);
			}

			throw new Error(`Service not found: ${String(norm)}`);
		} finally {
			this.resolutionStack.pop();
		}
	}

	private resolveBinding<T>(norm: string | symbol | number): T {
		const binding = this.bindings.get(norm)!;
		const { provider, shared } = binding;

		let instance: T;

		if (typeof provider === 'object' && 'useFactory' in provider) {
			const config = provider as any;
			const deps = config.inject?.map((dep: ServiceIdentifier) => this.get(dep)) || [];
			instance = config.useFactory(this, ...deps);
		} else if (typeof provider === 'function') {
			if (this.isClass(provider)) {
				instance = this.instantiate(provider as any);
			} else {
				instance = (provider as Factory<T>)(this);
			}
		} else {
			instance = provider;
		}

		if (shared) {
			this.instances.set(norm, instance);
		}

		return instance;
	}

	private instantiate<T>(ctor: new (...args: any[]) => T): T {
		const { paramTypes, hasDefault } = this.getDependencies(ctor);

		const deps = paramTypes.map((param, index) => {
			if (!param) {
				return hasDefault[index] ? undefined : null;
			}

			try {
				return this.get(param);
			} catch (e) {
				if (hasDefault[index]) return undefined;
				if (this.options.strict) throw e;
				return null;
			}
		});

		return new ctor(...deps);
	}

	private getDependencies(ctor: Function): { paramTypes: any[]; hasDefault: boolean[] } {
		if (this.resolutionCache.has(ctor)) {
			return this.resolutionCache.get(ctor)!;
		}

		const paramTypes: any[] = Reflect.getMetadata('design:paramtypes', ctor) || [];

		const ctorSource = ctor.toString();
		const match = ctorSource.match(/constructor\s*\(([^)]*)\)/);
		let hasDefault: boolean[] = [];

		if (match && match[1].trim()) {
			const params = match[1].split(',').map((p) => p.trim());
			hasDefault = params.map((p) => p.includes('='));
		} else {
			hasDefault = Array(paramTypes.length).fill(false);
		}

		const result = { paramTypes, hasDefault };
		this.resolutionCache.set(ctor, result);
		return result;
	}

	private isClass(func: any): boolean {
		return /^class\s/.test(func.toString()) || func.prototype?.constructor === func;
	}

	public has(id: ServiceIdentifier): boolean {
		const norm = this.normalizeId(id);
		return this.bindings.has(norm) || this.instances.has(norm) || (this.parent ? this.parent.has(id) : false);
	}

	public remove(id: ServiceIdentifier): boolean {
		const norm = this.normalizeId(id);
		const hasBinding = this.bindings.delete(norm);
		const hasInstance = this.instances.delete(norm);
		return hasBinding || hasInstance;
	}

	public clear(): void {
		this.bindings.clear();
		this.instances.clear();
		this.resolutionCache.clear();
	}

	public createChild(options?: ContainerOptions): Container {
		const child = new Container({ ...this.options, ...options });
		child.parent = this;
		this.children.push(child);
		return child;
	}

	public getRegistrations(): Array<{ id: string | symbol | number; shared: boolean }> {
		return Array.from(this.bindings.entries()).map(([id, binding]) => ({
			id,
			shared: binding.shared,
		}));
	}

	public getAll<T>(ids: ServiceIdentifier<T>[]): T[] {
		return ids.map((id) => this.get(id));
	}

	public inject<T extends object>(target: T): T {
		const ctor = target.constructor as any;
		const { paramTypes } = this.getDependencies(ctor);

		const propertyKeys = Object.getOwnPropertyNames(target);

		paramTypes.forEach((paramType, index) => {
			if (paramType && propertyKeys[index]) {
				try {
					(target as any)[propertyKeys[index]] = this.get(paramType);
				} catch (e) {
					// Ignorar si no se puede inyectar
				}
			}
		});

		return target;
	}

	public snapshot(): { bindings: number; instances: number; children: number } {
		return {
			bindings: this.bindings.size,
			instances: this.instances.size,
			children: this.children.length,
		};
	}

	public dispose(): void {
		for (const instance of this.instances.values()) {
			if (instance && typeof instance.dispose === 'function') {
				try {
					instance.dispose();
				} catch (e) {
					console.warn('[Container] Error disposing instance:', e);
				}
			}
		}

		this.clear();
		this.children.forEach((child) => child.dispose());
		this.children = [];
	}
}

export const container = new Container();

export function Injectable<T extends new (...args: any[]) => {}>(constructor: T): T;
export function Injectable(token?: ServiceIdentifier): ClassDecorator;
export function Injectable<T extends new (...args: any[]) => {}>(
	constructorOrToken?: T | ServiceIdentifier
): T | ClassDecorator {
	if (typeof constructorOrToken === 'function') {
		container.set(constructorOrToken);
		return constructorOrToken;
	}

	// @ts-ignore
	return function <T extends new (...args: any[]) => {}>(constructor: T): T {
		container.set(constructorOrToken || constructor, constructor);
		return constructor;
	};
}

export function Inject(token: ServiceIdentifier) {
	return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
		const existingTokens = Reflect.getMetadata('design:paramtypes', target) || [];
		existingTokens[parameterIndex] = token;
		Reflect.defineMetadata('design:paramtypes', existingTokens, target);
	};
}
