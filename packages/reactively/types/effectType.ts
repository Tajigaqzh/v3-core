
import { TrackOpTypes, TriggerOpTypes } from "../src/operations"

export interface ReactiveEffectOptions {
    lazy?: boolean

}
export interface DebuggerOptions {
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

export type DebuggerEvent = {
    effect
  } & DebuggerEventExtraInfo
  
  export type DebuggerEventExtraInfo = {
    target: object
    type: TrackOpTypes | TriggerOpTypes
    key: any
    newValue?: any
    oldValue?: any
    oldTarget?: Map<any, any> | Set<any>
  }