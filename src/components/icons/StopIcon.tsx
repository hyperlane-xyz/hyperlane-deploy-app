import { DefaultIconProps } from '@hyperlane-xyz/widgets';
import { memo } from 'react';
import { Color } from '../../styles/Color';

// TODO move to widgets lib
function _StopIcon({ color, ...rest }: DefaultIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" {...rest}>
      <g clipPath="url(#stop-icon-clip-path)">
        <path
          fill={color || Color.black}
          d="M3.5 12 0 8.5v-5L3.5 0h5L12 3.5v5L8.5 12h-5Zm.6-3.2L6 7l1.9 2 1-1-2-1.9 2-1.9-1-1-1.9 2-1.9-2-1 1 2 1.9-2 1.9 1 1Zm0 1.9h3.8l2.8-2.8V4.1L7.9 1.3H4.1L1.3 4.1v3.8l2.8 2.8Z"
        />
      </g>
      <defs>
        <clipPath id="stop-icon-clip-path">
          <path fill="#fff" d="M0 0h12v12H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}

export const StopIcon = memo(_StopIcon);
