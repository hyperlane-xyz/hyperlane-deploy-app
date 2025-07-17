import { IconButton, XIcon } from '@hyperlane-xyz/widgets';
import clsx from 'clsx';
import {
  ChangeEvent,
  InputHTMLAttributes,
  Ref,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';
import { Color } from '../../styles/Color';
import { ALLOWED_IMAGE_TYPES } from '../../types/createPr';

type ImageInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'type' | 'value'
> & {
  value?: File;
  onChange: (file: File | undefined) => void;
  onClear: () => void;
};

export const ImageInput = forwardRef(function ImageInput(
  { value, onChange, onClear, className, ...props }: ImageInputProps,
  forwardedRef: Ref<HTMLInputElement>,
) {
  const internalRef = useRef<HTMLInputElement | null>(null);
  useImperativeHandle(forwardedRef, () => internalRef.current as HTMLInputElement);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    onChange(selected);
  };

  const handleClear = () => {
    if (internalRef.current) internalRef.current.value = ''; // Clear native file input
    onClear();
  };

  return (
    <div className="relative w-full cursor-pointer">
      <input
        ref={internalRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        onChange={handleChange}
        className={clsx(defaultClassName, className)}
        {...props}
      />
      {value && (
        <IconButton
          className="absolute right-2 top-[55%] -translate-y-1/2 text-gray-500"
          onClick={handleClear}
        >
          <XIcon width={10} height={10} color={Color.gray['500']} />
        </IconButton>
      )}
    </div>
  );
});

const defaultClassName =
  'mt-1.5 px-2.5 py-2 cursor-pointer text-sm rounded-lg border border-primary-300 focus:border-primary-500 disabled:bg-gray-150 outline-none transition-all duration-300';
