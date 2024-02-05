/**
 * 收集依赖操作符
 */
export const enum TrackOpTypes {
    GET = "get",
    HAS = "has",
    ITERATE = "iterate"
}
/**
 * 触发依赖操作符
 */
export const enum TriggerOpTypes {
    SET = 'set',
    ADD = 'add',
    DELETE = 'delete',
    CLEAR = 'clear'
}