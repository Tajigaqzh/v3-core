
import { IfAny } from "@vue/shared";
import { CollectionTypes } from "./collectionType";
import { ShallowReactiveMarker } from "./reactiveType";

declare const RefSymbol: unique symbol;
export declare const RawSymbol: unique symbol;

export interface Ref<T = any> {
	value: T;
	/**
	 * 仅仅是一个类型区分器，我们需要它在public d.ts中，但是不想在IDE自动补全中显示，
	 * 所以我们使用一个私有的Symbol
	 */
	[RefSymbol]: true;
}

export type ToRefs<T = any> = {
	[K in keyof T]: ToRef<T[K]>;
};

declare const ShallowRefMarker: unique symbol;
export type ShallowRef<T = any> = Ref<T> & { [ShallowRefMarker]?: true };

type BaseTypes = string | number | boolean;
export interface RefUnwrapBailTypes { }

export type UnwrapRef<T> = T extends ShallowRef<infer V>
	? V
	: T extends Ref<infer V>
	? UnwrapRefSimple<V>
	: UnwrapRefSimple<T>;

    export type UnwrapRefSimple<T> = T extends
	| Function
	| CollectionTypes
	| BaseTypes
	| Ref
	| RefUnwrapBailTypes[keyof RefUnwrapBailTypes]
	| { [RawSymbol]?: true }
	? T
	: T extends ReadonlyArray<any>
	? { [K in keyof T]: UnwrapRefSimple<T[K]> }
	: T extends object & { [ShallowReactiveMarker]?: never }
	? {
		[P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>;
	}
	: T;

export type ToRef<T> = IfAny<T, Ref<T>, [T] extends [Ref] ? T : Ref<T>>;