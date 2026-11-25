import React, { useEffect, useRef, useState } from 'react';

interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number | '' | null | undefined;
  onChangeNumber?: (value: number) => void;
  onValueChange?: (value: number | '') => void;
  emptyFallback?: number;
  integer?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChangeNumber,
  onValueChange,
  emptyFallback = 0,
  integer = false,
  ...rest
}) => {
  const normalizedIncoming: number | '' =
    value === '' || value === null || value === undefined || Number.isNaN(value)
      ? ''
      : value;

  const [text, setText] = useState<string>(
    normalizedIncoming === '' ? '' : String(normalizedIncoming)
  );
  const lastCommittedRef = useRef<number | ''>(normalizedIncoming);

  useEffect(() => {
    if (normalizedIncoming !== lastCommittedRef.current) {
      lastCommittedRef.current = normalizedIncoming;
      setText(normalizedIncoming === '' ? '' : String(normalizedIncoming));
    }
  }, [normalizedIncoming]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);

    if (raw.trim() === '') {
      if (onValueChange) {
        lastCommittedRef.current = '';
        onValueChange('');
      } else if (onChangeNumber) {
        lastCommittedRef.current = emptyFallback;
        onChangeNumber(emptyFallback);
      }
      return;
    }

    const parsed = integer ? parseInt(raw, 10) : parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      lastCommittedRef.current = parsed;
      if (onValueChange) onValueChange(parsed);
      if (onChangeNumber) onChangeNumber(parsed);
    }
  };

  return <input type="number" value={text} onChange={handleChange} {...rest} />;
};
