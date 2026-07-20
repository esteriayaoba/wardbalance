"use client";

import React, { useRef, useEffect } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
}

export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
}: OtpInputProps) {
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Initialize refs list
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Autofocus the first cell on mount
  useEffect(() => {
    if (!disabled && inputRefs.current[0]) {
      // Small timeout to ensure page animation finishes
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [disabled]);

  const getOtpArray = () => {
    const arr = value.split("");
    while (arr.length < length) {
      arr.push("");
    }
    return arr.slice(0, length);
  };

  const otpArray = getOtpArray();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    // Only allow numeric input
    if (val && !/^[0-9]$/.test(val)) return;

    const newOtpArray = [...otpArray];
    newOtpArray[index] = val;
    const newValue = newOtpArray.join("");
    onChange(newValue);

    // Dynamic focus shifting forward
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Trigger onComplete auto-submit
    if (newValue.length === length && onComplete) {
      onComplete(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const currentVal = otpArray[index];
      if (!currentVal && index > 0) {
        // Clear previous cell and shift focus backward
        const newOtpArray = [...otpArray];
        newOtpArray[index - 1] = "";
        const newValue = newOtpArray.join("");
        onChange(newValue);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current cell
        const newOtpArray = [...otpArray];
        newOtpArray[index] = "";
        onChange(newOtpArray.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData("text/plain").trim();
    // Match only digits, limit to length
    const numericPaste = pastedData.replace(/[^0-9]/g, "").slice(0, length);
    
    if (numericPaste) {
      onChange(numericPaste);
      
      // Focus the last filled input or the next empty one
      const targetIndex = Math.min(numericPaste.length, length - 1);
      inputRefs.current[targetIndex]?.focus();

      if (numericPaste.length === length && onComplete) {
        onComplete(numericPaste);
      }
    }
  };

  return (
    <div 
      className="flex justify-center items-center gap-2 md:gap-3" 
      role="group" 
      aria-label="Verification code input"
    >
      {otpArray.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            if (el) inputRefs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleInputChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          aria-label={`Digit ${idx + 1}`}
          className="w-12 h-12 sm:w-14 sm:h-14 text-center text-title-large font-bold bg-white text-neutral-900 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all tabular-nums shadow-xs disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-[44px] min-w-[44px]"
        />
      ))}
    </div>
  );
}
