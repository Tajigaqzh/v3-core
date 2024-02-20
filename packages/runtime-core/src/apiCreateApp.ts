//创建vnode
import { version } from "os";
import { InjectionKey } from "./apiInject";
import { Data } from "./component";
import { RuntimeCompilerOptions } from "./componentOptions";
import { RootRenderFunction } from "./renderer";
import { VNode, createVNode } from "./vnode";
import { NO, extend, isFunction, isObject } from "@vue/shared";
import { run } from "node:test";

export interface AppConfig {
	// @private
	readonly isNativeTag?: (tag: string) => boolean;

	performance: boolean;
	// optionMergeStrategies: Record<string, OptionMergeFunction>//属性合并策略
	optionMergeStrategies: Record<string, any>;
	// globalProperties: ComponentCustomProperties & Record<string, any>//全局属性
	globalProperties: any;
	errorHandler?: (
		err: unknown,
		instance: any | null,
		//   instance: ComponentPublicInstance | null,
		info: string
	) => void; //异常处理
	warnHandler?: (
		msg: string,
		// instance: ComponentPublicInstance | null,
		instance: any | null,
		trace: string
	) => void; //警告处理

	/**
	 * 编译选项
	 * Options to pass to `@vue/compiler-dom`.
	 * Only supported in runtime compiler build.
	 */
	compilerOptions: RuntimeCompilerOptions;

	/**
	 * 过期了，使用config.compilerOptions.isCustomElement替代
	 * @deprecated use config.compilerOptions.isCustomElement
	 */
	isCustomElement?: (tag: string) => boolean;
}

export interface App<HostElement = any> {
	version: string;
	config: AppConfig;

	use<Options extends unknown[]>(plugin: any, ...options: Options): this;
	use(plugin: any, ...options: any): this;

	mixin(mixin: any): this;
	// component(name: string): any | undefined;
	component(name: string, component: any): this;
	// directive<T = any, V = any>(name: string): any | undefined;
	directive<T = any, V = any>(name: string, directive: any): this;
	mount(
		rootContainer: HostElement | string,
		isHydrate?: boolean,
		namespace?: boolean | any
	): any;
	unmount(): void;
	provide<T>(key: InjectionKey<T> | string, value: T): this;

	/**
	 * Runs a function with the app as active instance. This allows using of `inject()` within the function to get access
	 * to variables provided via `app.provide()`.
	 *
	 * @param fn - function to run with the app as active instance
	 */
	runWithContext<T>(fn: () => T): T;

	// internal, but we need to expose these for the server-renderer and devtools
	_uid: number;
	_component: any;
	_props: Data | null;
	_container: HostElement | null;
	_context: AppContext;
	_instance: any | null;
}

export type CreateAppFunction<HostElement> = (
	// rootComponent: Component,
	rootComponent: any,
	rootProps?: Data | null
) => App<HostElement>;

/**
 * app上下文，app，配置，混入，全局组件，全局指令，providers
 */

export interface AppContext {
	app: App; // for devtools
	config: AppConfig;
	// mixins: ComponentOptions[];
	mixins: any[];
	// components: Record<string, Component>;
	components: Record<string, any>;
	// directives: Record<string, Directive>;
	directives: Record<string, any>;
	provides: Record<string | symbol, any>;

	/**
	 * Cache for merged/normalized component options
	 * Each app instance has its own cache because app-level global mixins and
	 * optionMergeStrategies can affect merge behavior.
	 * @internal
	 */
	// optionsCache: WeakMap<ComponentOptions, MergedComponentOptions>
	optionsCache: WeakMap<any, any>;
	/**
	 * Cache for normalized props options
	 * @internal
	 */
	// propsCache: WeakMap<ConcreteComponent, NormalizedPropsOptions>
	propsCache: WeakMap<any, any>;
	/**
	 * Cache for normalized emits options
	 * @internal
	 */
	// emitsCache: WeakMap<ConcreteComponent, ObjectEmitsOptions | null>
	emitsCache: WeakMap<any, any>;
	/**
	 * HMR only
	 * @internal
	 */
	reload?: () => void;
	/**
	 * v2 compat only
	 * @internal
	 */
	filters?: Record<string, Function>;
}

/**
 * 创建app上下文，返回一个对象
 */
export function createAppContext(): AppContext {
	return {
		app: null as any,
		config: {
			isNativeTag: NO,
			performance: false,
			globalProperties: {},
			optionMergeStrategies: {},
			errorHandler: undefined,
			warnHandler: undefined,
			compilerOptions: {},
		},
		mixins: [],
		components: {},
		directives: {},
		provides: Object.create(null),
		optionsCache: new WeakMap(),
		propsCache: new WeakMap(),
		emitsCache: new WeakMap(),
	};
}
let uid = 0;

export function createAppAPI<HostElement>(
	render: RootRenderFunction<HostElement>
) {
	// createApp函数，参数：1.根组件；2.根属性
	return function createApp(rootComponent, rootProps = null) {
		//告诉他是那个组件，那个属性
		if (!isFunction(rootComponent)) {
			//不是函数组件
			rootComponent = extend({}, rootComponent);
		}
		// 处理rootProps
		if (rootProps != null && !isObject(rootProps)) {
			console.warn("root props passed to app.createApp() must be an object.");
			rootProps = null;
		}

		// 创建app上下文
		const context = createAppContext();
		let isMounted = false;

		// 初始化对象，绑定uid，组件，props，上下文
		const app: App = ((context.app as any) = {
			_uid: uid++,
			_component: rootComponent,
			_props: rootProps,
			_container: null,
			_context: context,
			_instance: null,
			version: "3.4.2",

			provide(key, value) {
				context.provides[key as string | symbol] = value;

				return app;
			},

			use(plugin, ...options) {
				if (plugin && isFunction(plugin.install)) {
					plugin.install(app, ...options);
				} else if (isFunction(plugin)) {
					plugin(app, ...options);
				}
				return app;
			},
			mixin(mixin) {
				if (!context.mixins.includes(mixin)) {
					context.mixins.push(mixin);
				}
				return app;
			},
			component(name: string, component) {
				if (!component) {
					return context.components[name];
				}
				context.components[name] = component;
				return app;
			},
			directive(name: string, directive) {
				if (!directive) {
					return context.directives[name];
				}
				context.directives[name] = directive;
				return app;
			},
			get config() {
				return context.config;
			},
			// 挂在函数
			mount(
				rootContainer: HostElement,
				isHydrate?: boolean,
				namespace?: boolean | string
			) {
				if (!isMounted) {
					const vnode = createVNode(rootComponent, rootProps) as any as VNode;
					//把当前上下文挂载到vnode上
					vnode.appContext = context;
					// 处理svg
					// if (namespace === true) {
					// 	namespace = "svg";
					// } else if (namespace === false) {
					// 	namespace = undefined;
					// }

                     
					render(vnode, rootContainer);
				}
                isMounted = true;
                app._container = rootContainer;

			},
			unmount() {},
			runWithContext(fn) {
				currentApp = app;
				try {
					return fn();
				} finally {
					currentApp = null;
				}
			},
		});

		// let app = {
		// 	//添加相关的属性
		// 	_component: rootComponent,
		// 	_props: rootProps,
		// 	_container: null,
		// 	mount(container) {
		// 		//挂载的位置
		// 		// console.log(container, rootComponent, rootProps, renderOptionDom)
		// 		//框架 组件     vnode
		// 		//1vnode： 根据组件创建vnode节点
		// 		let vnode = createVnode(rootComponent, rootProps);
		// 		//  console.log(vnode) //vnode
		// 		//2 渲染 render(vnode,container)
		// 		render(vnode, container);

		// 		app._container = container;
		// 	},
		// };
		return app;
	};
}
export let currentApp: App<unknown> | null = null;
