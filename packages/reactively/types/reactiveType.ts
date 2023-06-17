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

export interface Target {
    [ReactiveFlags.SKIP]?: boolean; //不做响应式处理的数据
    [ReactiveFlags.IS_REACTIVE]?: boolean; //target是否是响应式
    [ReactiveFlags.IS_READONLY]?: boolean; //target是否是只读
    [ReactiveFlags.IS_SHALLOW]?: boolean; //是否是浅层次
    [ReactiveFlags.RAW]?: any; //proxy对应的源数据
}