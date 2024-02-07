export enum DirtyLevels {
	NotDirty = 0,
	MaybeDirty = 1,
	Dirty = 2,
}
export enum TrackOpTypes {
	GET = "get",
	HAS = "has",
	ITERATE = "iterate",
}

export enum TriggerOpTypes {
	SET = "set",
	ADD = "add",
	DELETE = "delete",
	CLEAR = "clear",
}
export const enum ReactiveFlags {
  //跳过
  SKIP = "__v_skip",
  //是否是响应式
  IS_REACTIVE = "__v_isReactive",
  //是否是只读
  IS_READONLY = "__v_isReadonly",
  //是否是浅层次
  IS_SHALLOW = "__v_isShallow",
  //proxy对应的源数据
  RAW = "__v_raw",
}