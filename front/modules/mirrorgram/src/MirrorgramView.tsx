import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';

import { MirrorgramViewProps } from './Mirrorgram.types';

const NativeView: React.ComponentType<MirrorgramViewProps> =
  requireNativeViewManager('Mirrorgram');

export default function MirrorgramView(props: MirrorgramViewProps) {
  return <NativeView {...props} />;
}
