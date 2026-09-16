import type { ComponentProps } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;
export const TabsList = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    className={cn("inline-flex items-center gap-1 rounded-md bg-secondary p-1", className)}
    {...props}
  />
);
export const TabsTrigger = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      "inline-flex h-8 items-center rounded-sm px-3 text-sm text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground",
      className,
    )}
    {...props}
  />
);
export const TabsContent = TabsPrimitive.Content;
