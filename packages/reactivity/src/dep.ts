import { ComputedRefImpl } from "./computed";
import { ReactiveEffect } from "./effect";


export type Dep = Map<ReactiveEffect, number> & {
	cleanup: () => void;
	computed?: ComputedRefImpl<any>;
};


export const createDep = (
	cleanup: () => void,
	computed?: ComputedRefImpl<any>
): Dep => {
	const dep = new Map() as Dep;
	// dep的清除函数
	dep.cleanup = cleanup;
	// dep的计算属性
	dep.computed = computed;
	return dep;
};
