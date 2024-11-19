import * as React from 'react';

import { MirrorgramViewProps } from './Mirrorgram.types';

export default function MirrorgramView(props: MirrorgramViewProps) {
  return (
    <div>
      <span>{props.name}</span>
    </div>
  );
}
