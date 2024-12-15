import { DefaultIconProps } from '@hyperlane-xyz/widgets';
import { memo } from 'react';
import { Color } from '../../styles/Color';

// TODO move to widgets lib
function _GasIcon({ color, ...rest }: DefaultIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" {...rest}>
      <g clipPath="url(#a)">
        <path
          fill={color || Color.black}
          d="M3.1 6.3A6.3 6.3 0 0 1 9.4 0H28a6.2 6.2 0 0 1 6.3 6.3v25a6.2 6.2 0 0 1 6.2 6.2v1.6a1.6 1.6 0 0 0 3.1 0V25h-1.5a1.6 1.6 0 0 1-1.6-1.6v-9.7a1.6 1.6 0 0 1 1.6-1.6h4.7a10 10 0 0 0-.7-3.8A3 3 0 0 0 45 6.9a5 5 0 0 0-2.8-.7 1.6 1.6 0 0 1 0-3c1.8 0 3.2.3 4.4 1 1.2.7 2 1.7 2.5 2.8.9 2 .9 4.6.9 6.5v10a1.6 1.6 0 0 1-1.6 1.5H47v14a4.7 4.7 0 0 1-9.4 0v-1.5a3.1 3.1 0 0 0-3.1-3.1v12.5H36a1.6 1.6 0 0 1 0 3.1H1.6a1.6 1.6 0 1 1 0-3.1H3V6.3Zm7.8 0a1.6 1.6 0 0 0-1.5 1.5v15.6a1.6 1.6 0 0 0 1.5 1.6h15.7a1.6 1.6 0 0 0 1.5-1.6V7.8a1.6 1.6 0 0 0-1.5-1.5H10.9Z"
        />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M0 0h50v50H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}

export const GasIcon = memo(_GasIcon);
