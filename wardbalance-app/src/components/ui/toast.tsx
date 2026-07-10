"use client";

import * as React from "react";
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";

import { cn } from "@/lib/utils";

type ToastProps = React.ComponentProps<typeof SonnerToaster>;

const Toaster = ({ className, ...props }: ToastProps) => {
  return (
    <SonnerToaster
      className={cn("toaster group", className)}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-on-surface group-[.toaster]:border group-[.toaster]:border-outline-variant group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-on-surface-variant",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-on-primary",
          cancelButton:
            "group-[.toast]:bg-surface-variant group-[.toast]:text-on-surface-variant",
        },
      }}
      {...props}
    />
  );
};

const toast = sonnerToast;

export { Toaster, toast };
