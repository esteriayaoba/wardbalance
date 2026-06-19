import React, { forwardRef } from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", label, error, children, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-label-medium text-neutral-700 block">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium bg-white transition-colors focus:outline-2 focus:outline-primary/50 focus:outline-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? "border-error focus:outline-error/50" : ""
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-label-small text-error">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
