import { hasOwn } from "@vue/shared";
import { ComponentInjectOptions, ComponentOptionsBase, ComputedOptions, MethodOptions } from "./componentOptions";
import { EmitsOptions } from "./componentEmits";
import { SlotsType } from "./componentSlots";
import { ComponentInternalInstance } from "./component";

export const componentPublicIntance = {
	// {_:instance}
	// 拦截器，拦截get操作，使得可以通过proxy直接获取属性，proxy.name而不必proxy.props.name
	get({ _: instance }, key) {
		//获取值 props children  data
		const { props, data, setupState } = instance;
		if (key[0] == "$") {
			// 属性 $ 开头的不能获取
			return;
		}
		if (hasOwn(props, key)) {
			return props[key];
		} else if (hasOwn(setupState, key)) {
			return setupState[key];
		}
	},
	set({ _: instance }, key, value) {
		const { props, data, setupState } = instance;

		if (hasOwn(props, key)) {
			props[key] = value;
		} else if (hasOwn(setupState, key)) {
			setupState[key] = value;
		}
	},
};

// public properties exposed on the proxy, which is used as the render context
// in templates (as `this` in the render option)
export type ComponentPublicInstance<
	P = {}, // props type extracted from props option
	B = {}, // raw bindings returned from setup()
	D = {}, // return from data()
	C extends ComputedOptions = {},
	M extends MethodOptions = {},
	E extends EmitsOptions = {},
	PublicProps = P,
	Defaults = {},
	MakeDefaultsOptional extends boolean = false,
	Options = ComponentOptionsBase<any, any, any, any, any, any, any, any, any>,
	I extends ComponentInjectOptions = {},
	S extends SlotsType = {}
> = {
	$: ComponentInternalInstance;
	$data: D;
	$props: MakeDefaultsOptional extends true
		? Partial<Defaults> & Omit<Prettify<P> & PublicProps, keyof Defaults>
		: Prettify<P> & PublicProps;
	$attrs: Data;
	$refs: Data;
	$slots: UnwrapSlotsType<S>;
	$root: ComponentPublicInstance | null;
	$parent: ComponentPublicInstance | null;
	$emit: EmitFn<E>;
	$el: any;
	$options: Options & MergedComponentOptionsOverride;
	$forceUpdate: () => void;
	$nextTick: typeof nextTick;
	$watch<T extends string | ((...args: any) => any)>(
		source: T,
		cb: T extends (...args: any) => infer R
			? (...args: [R, R]) => any
			: (...args: any) => any,
		options?: WatchOptions
	): WatchStopHandle;
} & IfAny<P, P, Omit<P, keyof ShallowUnwrapRef<B>>> &
	ShallowUnwrapRef<B> &
	UnwrapNestedRefs<D> &
	ExtractComputedReturns<C> &
	M &
	ComponentCustomProperties &
	InjectToObject<I>;

export type ComponentPublicInstanceConstructor<
	T extends ComponentPublicInstance<
		Props,
		RawBindings,
		D,
		C,
		M
	> = ComponentPublicInstance<any>,
	Props = any,
	RawBindings = any,
	D = any,
	C extends ComputedOptions = ComputedOptions,
	M extends MethodOptions = MethodOptions
> = {
	__isFragment?: never;
	__isTeleport?: never;
	__isSuspense?: never;
	new (...args: any[]): T;
};

export type CreateComponentPublicInstance<
	P = {},
	B = {},
	D = {},
	C extends ComputedOptions = {},
	M extends MethodOptions = {},
	Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
	Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
	E extends EmitsOptions = {},
	PublicProps = P,
	Defaults = {},
	MakeDefaultsOptional extends boolean = false,
	I extends ComponentInjectOptions = {},
	S extends SlotsType = {},
	PublicMixin = IntersectionMixin<Mixin> & IntersectionMixin<Extends>,
	PublicP = UnwrapMixinsType<PublicMixin, "P"> & EnsureNonVoid<P>,
	PublicB = UnwrapMixinsType<PublicMixin, "B"> & EnsureNonVoid<B>,
	PublicD = UnwrapMixinsType<PublicMixin, "D"> & EnsureNonVoid<D>,
	PublicC extends ComputedOptions = UnwrapMixinsType<PublicMixin, "C"> &
		EnsureNonVoid<C>,
	PublicM extends MethodOptions = UnwrapMixinsType<PublicMixin, "M"> &
		EnsureNonVoid<M>,
	PublicDefaults = UnwrapMixinsType<PublicMixin, "Defaults"> &
		EnsureNonVoid<Defaults>
> = ComponentPublicInstance<
	PublicP,
	PublicB,
	PublicD,
	PublicC,
	PublicM,
	E,
	PublicProps,
	PublicDefaults,
	MakeDefaultsOptional,
	ComponentOptionsBase<
		P,
		B,
		D,
		C,
		M,
		Mixin,
		Extends,
		E,
		string,
		Defaults,
		{},
		string,
		S
	>,
	I,
	S
>;
