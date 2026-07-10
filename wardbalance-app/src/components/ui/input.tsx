import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-outline bg-surface px-3 py-2 text-body-medium text-on-surface file:border-0 file:bg-transparent file:text-body-small file:font-bold placeholder:text-on-surface-variant focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
