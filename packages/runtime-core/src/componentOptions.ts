import {
	type ComputedGetter,
	type WritableComputedOptions,
	reactive,
} from "@vue/reactivity";
import { ComponentInternalInstance, ConcreteComponent } from "./component";
import { EmitsOptions } from "./componentEmits";
import { SlotsType } from "./componentSlots";

//inject基础类型
type ObjectInjectOptions = Record<
  string | symbol,
  string | symbol | { from?: string | symbol; default?: unknown }
>

//inject参数类型
export type ComponentInjectOptions = string[] | ObjectInjectOptions

//计算属性配置
export type ComputedOptions = Record<
	string,
	ComputedGetter<any> | WritableComputedOptions<any>
>;
//方法参数
export interface MethodOptions {
	[key: string]: Function;
}
/**
 * 组件的参数
 */
export type ComponentOptions<
	Props = {},
	RawBindings = any,
	D = any,
	C extends ComputedOptions = any,
	M extends MethodOptions = any,
	Mixin extends ComponentOptionsMixin = any,
	Extends extends ComponentOptionsMixin = any,
	E extends EmitsOptions = any,
	S extends SlotsType = any
> = ComponentOptionsBase<
	Props,
	RawBindings,
	D,
	C,
	M,
	Mixin,
	Extends,
	E,
	string,
	S
> &
	ThisType<
		CreateComponentPublicInstance<
			{},
			RawBindings,
			D,
			C,
			M,
			Mixin,
			Extends,
			E,
			Readonly<Props>
		>
	>;

export interface ComponentOptionsBase<
	Props,
	RawBindings,
	D,
	C extends ComputedOptions,
	M extends MethodOptions,
	Mixin extends ComponentOptionsMixin,
	Extends extends ComponentOptionsMixin,
	E extends EmitsOptions,
	EE extends string = string,
	Defaults = {},
	I extends ComponentInjectOptions = {},
	II extends string = string,
	S extends SlotsType = {}
> extends LegacyOptions<Props, D, C, M, Mixin, Extends, I, II>,
		ComponentInternalOptions,
		ComponentCustomOptions {
	setup?: (
		this: void,
		props: LooseRequired<
			Props &
				Prettify<
					UnwrapMixinsType<
						IntersectionMixin<Mixin> & IntersectionMixin<Extends>,
						"P"
					>
				>
		>,
		ctx: SetupContext<E, S>
	) => Promise<RawBindings> | RawBindings | RenderFunction | void;
	name?: string;
	template?: string | object; // can be a direct DOM node
	// Note: we are intentionally using the signature-less `Function` type here
	// since any type with signature will cause the whole inference to fail when
	// the return expression contains reference to `this`.
	// Luckily `render()` doesn't need any arguments nor does it care about return
	// type.
	render?: Function;
	components?: Record<string, Component>;
	directives?: Record<string, Directive>;
	inheritAttrs?: boolean;
	emits?: (E | EE[]) & ThisType<void>;
	slots?: S;
	// TODO infer public instance type based on exposed keys
	expose?: string[];
	serverPrefetch?(): void | Promise<any>;

	// Runtime compiler only -----------------------------------------------------
	compilerOptions?: RuntimeCompilerOptions;

	// Internal ------------------------------------------------------------------

	/**
	 * SSR only. This is produced by compiler-ssr and attached in compiler-sfc
	 * not user facing, so the typing is lax and for test only.
	 * @internal
	 */
	ssrRender?: (
		ctx: any,
		push: (item: any) => void,
		parentInstance: ComponentInternalInstance,
		attrs: Data | undefined,
		// for compiler-optimized bindings
		$props: ComponentInternalInstance["props"],
		$setup: ComponentInternalInstance["setupState"],
		$data: ComponentInternalInstance["data"],
		$options: ComponentInternalInstance["ctx"]
	) => void;

	/**
	 * Only generated by compiler-sfc to mark a ssr render function inlined and
	 * returned from setup()
	 * @internal
	 */
	__ssrInlineRender?: boolean;

	/**
	 * marker for AsyncComponentWrapper
	 * @internal
	 */
	__asyncLoader?: () => Promise<ConcreteComponent>;
	/**
	 * the inner component resolved by the AsyncComponentWrapper
	 * @internal
	 */
	__asyncResolved?: ConcreteComponent;

	// Type differentiators ------------------------------------------------------

	// Note these are internal but need to be exposed in d.ts for type inference
	// to work!

	// type-only differentiator to separate OptionWithoutProps from a constructor
	// type returned by defineComponent() or FunctionalComponent
	call?: (this: unknown, ...args: unknown[]) => never;
	// type-only differentiators for built-in Vnode types
	__isFragment?: never;
	__isTeleport?: never;
	__isSuspense?: never;

	__defaults?: Defaults;
}

export type ComponentOptionsMixin = ComponentOptionsBase<
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;
