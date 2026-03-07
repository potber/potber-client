import { State } from 'reactiveweb/function';

export type TrackedState<T> = State<Promise<T>>;
