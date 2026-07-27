import { useRef } from 'react';
import type { KeyboardEvent, ClipboardEvent } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function OtpInput({ length = 6, value, onChange, disabled = false }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Derive internal values from the value prop
  const internalValues = value.split('').concat(Array(length).fill('')).slice(0, length);

  const triggerChange = (newValues: string[]) => {
    onChange(newValues.join(''));
  };

  const handleChange = (index: number, val: string) => {
    if (disabled) return;
    
    const newVal = val.replace(/[^0-9]/g, '');
    if (newVal.length > 1) {
      handlePasteValue(newVal, index);
      return;
    }

    const newValues = [...internalValues];
    newValues[index] = newVal;
    
    if (newValues.join('') !== internalValues.join('')) {
      triggerChange(newValues);
    }

    // Auto focus next input
    if (newVal !== '' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (internalValues[index] !== '') {
        const newValues = [...internalValues];
        newValues[index] = '';
        triggerChange(newValues);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newValues = [...internalValues];
        newValues[index - 1] = '';
        triggerChange(newValues);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePasteValue = (pastedData: string, startIndex: number = 0) => {
    const numbersOnly = pastedData.replace(/[^0-9]/g, '').slice(0, length - startIndex);
    if (!numbersOnly) return;

    const newValues = [...internalValues];
    for (let i = 0; i < numbersOnly.length; i++) {
      if (startIndex + i < length) {
        newValues[startIndex + i] = numbersOnly[i];
      }
    }
    triggerChange(newValues);

    const nextIndex = Math.min(startIndex + numbersOnly.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    const pastedData = e.clipboardData.getData('text/plain');
    handlePasteValue(pastedData);
  };

  return (
    <div className="flex gap-2 sm:gap-2.5 justify-between max-w-full">
      {internalValues.map((v, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={v}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`
            w-11 sm:w-[60px] h-12 sm:h-[60px] text-center text-xl sm:text-2xl font-extrabold text-slate-900 bg-slate-50/80 border border-slate-200/90 rounded-2xl
            focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/20 focus:border-[#6C4CF1] focus:outline-none transition-all duration-200 shadow-2xs focus:-translate-y-0.5
            ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}
          `}
        />
      ))}
    </div>
  );
}
