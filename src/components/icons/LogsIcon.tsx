import { DefaultIconProps } from '@hyperlane-xyz/widgets';
import { memo } from 'react';
import { Color } from '../../styles/Color';

// TODO move to widgets lib
function _LogsIcon({ color, ...rest }: DefaultIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" {...rest}>
      <path
        d="M0 10V8.57143H6.25V10H0ZM0 7.14286V5.71429H10V7.14286H0ZM0 4.28571V2.85714H10V4.28571H0ZM0 1.42857V0H10V1.42857H0Z"
        fill={color || Color.black}
      />
    </svg>
  );
}

export const LogsIcon = memo(_LogsIcon);
