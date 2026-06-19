import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, type = "text", ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-label-medium text-neutral-700 block">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={`w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium bg-white transition-colors placeholder:text-neutral-450 focus:outline-2 focus:outline-primary/50 focus:outline-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? "border-error focus:outline-error/50" : ""
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-label-small text-error">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
