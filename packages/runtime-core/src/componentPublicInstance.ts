import { hasOwn } from "@vue/shared";
// import { ComponentInjectOptions, ComponentOptionsBase, ComputedOptions, MethodOptions } from "./componentOptions";
import { EmitsOptions } from "./componentEmits";
import { SlotsType } from "./componentSlots";
import { ComputedOptions, MethodOptions } from "./componentOptions";
// import { ComponentInternalInstance } from "./component";

export const componentPublicInstance = {
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

// export type ComponentPublicInstance<
//   P = {}, // props type extracted from props option
//   B = {}, // raw bindings returned from setup()
//   D = {}, // return from data()
//   C extends ComputedOptions = {},
//   M extends MethodOptions = {},
//   E extends EmitsOptions = {},
//   PublicProps = P,
//   Defaults = {},
//   MakeDefaultsOptional extends boolean = false,
//   Options = ComponentOptionsBase<any, any, any, any, any, any, any, any, any>,
//   I extends ComponentInjectOptions = {},
//   S extends SlotsType = {},
// > = {
//   $: ComponentInternalInstance
//   $data: D
//   $props: MakeDefaultsOptional extends true
//     ? Partial<Defaults> & Omit<Prettify<P> & PublicProps, keyof Defaults>
//     : Prettify<P> & PublicProps
//   $attrs: Data
//   $refs: Data
//   $slots: UnwrapSlotsType<S>
//   $root: ComponentPublicInstance | null
//   $parent: ComponentPublicInstance | null
//   $emit: EmitFn<E>
//   $el: any
//   $options: Options & MergedComponentOptionsOverride
//   $forceUpdate: () => void
//   $nextTick: typeof nextTick
//   $watch<T extends string | ((...args: any) => any)>(
//     source: T,
//     cb: T extends (...args: any) => infer R
//       ? (...args: [R, R]) => any
//       : (...args: any) => any,
//     options?: WatchOptions,
//   ): WatchStopHandle
// } & IfAny<P, P, Omit<P, keyof ShallowUnwrapRef<B>>> &
//   ShallowUnwrapRef<B> &
//   UnwrapNestedRefs<D> &
//   ExtractComputedReturns<C> &
//   M &
//   ComponentCustomProperties &
//   InjectToObject<I>

  
// export type ComponentPublicInstanceConstructor<
//   T extends ComponentPublicInstance<
//     Props,
//     RawBindings,
//     D,
//     C,
//     M
//   > = ComponentPublicInstance<any>,
//   Props = any,
//   RawBindings = any,
//   D = any,
//   C extends ComputedOptions = ComputedOptions,
//   M extends MethodOptions = MethodOptions,
// > = {
//   __isFragment?: never
//   __isTeleport?: never
//   __isSuspense?: never
//   new (...args: any[]): T
// }