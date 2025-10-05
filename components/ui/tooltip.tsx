"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = ({ className, ...props }: any) => (
  <TooltipPrimitive.Content
    className={cn(
      "rounded-md bg-gray-900 px-2 py-1 text-white text-sm shadow-md",
      className
    )}
    sideOffset={5}
    {...props}
  />
);

export { Tooltip, TooltipTrigger, TooltipContent };
