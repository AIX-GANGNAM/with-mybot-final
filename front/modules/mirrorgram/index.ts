import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to Mirrorgram.web.ts
// and on native platforms to Mirrorgram.ts
import MirrorgramModule from './src/MirrorgramModule';
import MirrorgramView from './src/MirrorgramView';
import { ChangeEventPayload, MirrorgramViewProps } from './src/Mirrorgram.types';

// Get the native constant value.
export const PI = MirrorgramModule.PI;

export function hello(): string {
  return MirrorgramModule.hello();
}

export async function setValueAsync(value: string) {
  return await MirrorgramModule.setValueAsync(value);
}

const emitter = new EventEmitter(MirrorgramModule ?? NativeModulesProxy.Mirrorgram);

export function addChangeListener(listener: (event: ChangeEventPayload) => void): Subscription {
  return emitter.addListener<ChangeEventPayload>('onChange', listener);
}

export { MirrorgramView, MirrorgramViewProps, ChangeEventPayload };
