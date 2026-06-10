import * as React from "react";
import { cn } from "@lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  as?: keyof React.JSX.IntrinsicElements;
}

export function Container({ className, as = "div", ...props }: ContainerProps) {
  return React.createElement(as, {
    className: cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className),
    ...props,
  });
}
