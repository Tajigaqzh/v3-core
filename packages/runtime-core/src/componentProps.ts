import {
	camelize,
	EMPTY_ARR,
	EMPTY_OBJ,
	extend,
	hasOwn,
	isArray,
	isFunction,
	isObject,
} from "@vue/shared";
import { Data } from "./component";
import { shallowReactive } from "@vue/reactivity";

export const updateProps = (p1, p2) => {

    
};

/**
 * 处理props（不是虚拟节点的prpos是component的）
 */

export const initProps = (instance, userProps) => {
	const attrs = {};
	const props = {};

	const options = instance.propsOptions || {};

	if (userProps) {
		for (let key in userProps) {
			// 	包含属性校验
			const value = userProps[key];

			// console.log(value);

			if (key in options) {
				// console.log("---");
				props[key] = value;
			} else {
				attrs[key] = value;
			}
		}
	}
	instance.attrs = attrs;
	instance.props = shallowReactive(props);
};

type PropMethod<T, TConstructor = any> = [T] extends [
	((...args: any) => any) | undefined
] // if is function with args, allowing non-required functions
	? { new (): TConstructor; (): T; readonly prototype: TConstructor } // Create Function like constructor
	: never;

type PropConstructor<T = any> =
	| { new (...args: any[]): T & {} }
	| { (): T }
	| PropMethod<T>;

export type PropType<T> = PropConstructor<T> | PropConstructor<T>[];

type DefaultFactory<T> = (props: Data) => T | null | undefined;

export interface PropOptions<T = any, D = T> {
	type?: PropType<T> | true | null;
	required?: boolean;
	default?: D | DefaultFactory<D> | null | undefined | object;

	validator?(value: unknown, props: Data): boolean;

	/**
	 * @internal
	 */
	skipCheck?: boolean;
	/**
	 * @internal
	 */
	skipFactory?: boolean;
}

export type Prop<T, D = T> = PropOptions<T, D> | PropType<T>;

enum BooleanFlags {
	shouldCast,
	shouldCastTrue,
}

type NormalizedProp =
	| null
	| (PropOptions & {
			[BooleanFlags.shouldCast]?: boolean;
			[BooleanFlags.shouldCastTrue]?: boolean;
	  });

export type NormalizedProps = Record<string, NormalizedProp>;
export type NormalizedPropsOptions = [NormalizedProps, string[]] | [];

export function normalizePropsOptions(
	comp,
	appContext,
	asMixin = false
): NormalizedPropsOptions {
	const cache = appContext.propsCache;
	const cached = cache.get(comp);
	if (cached) {
		return cached;
	}
	const raw = comp.props;

	const normalized = {};
	const needCastKeys = [];

	let hasExtends = false;
	if (!isFunction(comp)) {
		const extendProps = (raw) => {
			if (isFunction(raw)) {
				raw = raw.options;
			}
			hasExtends = true;
			const [props, keys] = normalizePropsOptions(raw, appContext, true);
			extend(normalized, props);
			if (keys) needCastKeys.push(...keys);
		};
		if (!asMixin && appContext.mixins.length) {
			appContext.mixins.forEach(extendProps);
		}
		if (comp.extends) {
			extendProps(comp.extends);
		}
		if (comp.mixins) {
			comp.mixins.forEach(extendProps);
		}
	}

	if (!raw && !hasExtends) {
		if (isObject(comp)) {
			cache.set(comp, EMPTY_ARR as any);
		}
		return EMPTY_ARR as any;
	}
	if (isArray(raw)) {
		for (let i = 0; i < raw.length; i++) {
			const normalizedKey = camelize(raw[i]);
			if (validatePropName(normalizedKey)) {
				normalized[normalizedKey] = EMPTY_OBJ;
			}
		}
	} else if (raw) {
		for (const key in raw) {
			const normalizedKey = camelize(key);
			if (validatePropName(normalizedKey)) {
				const opt = raw[key];
				const prop = (normalized[normalizedKey] =
					isArray(opt) || isFunction(opt) ? { type: opt } : extend({}, opt));
				if (prop) {
					const booleanIndex = getTypeIndex(Boolean, prop.type);
					const stringIndex = getTypeIndex(String, prop.type);
					prop[BooleanFlags.shouldCast] = booleanIndex > -1;
					prop[BooleanFlags.shouldCastTrue] =
						stringIndex < 0 || booleanIndex < stringIndex;
					// if the prop needs boolean casting or default value
					if (booleanIndex > -1 || hasOwn(prop, "default")) {
						needCastKeys.push(normalizedKey);
					}
				}
			}
		}
	}

	const res: NormalizedPropsOptions = [normalized, needCastKeys];
	if (isObject(comp)) {
		cache.set(comp, res);
	}
	return res;
}

function validatePropName(key: string) {
	if (key[0] !== "$") {
		return true;
	}
	return false;
}

function getTypeIndex(
	type: any,
	expectedTypes: any | void | null | true
): number {
	if (isArray(expectedTypes)) {
		return expectedTypes.findIndex((t) => isSameType(t, type));
	} else if (isFunction(expectedTypes)) {
		return isSameType(expectedTypes, type) ? 0 : -1;
	}
	return -1;
}

function isSameType(a, b): boolean {
	return getType(a) === getType(b);
}

function getType(ctor): string {
	const match = ctor && ctor.toString().match(/^\s*(function|class) (\w+)/);
	return match ? match[2] : ctor === null ? "null" : "";
}
