import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const v = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-emerald-100 text-emerald-800",
        secondary: "border-transparent bg-slate-100 text-slate-700",
        outline: "border-slate-200 text-slate-600",
        destructive: "border-transparent bg-red-100 text-red-700",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof v>) {
  return <div className={cn(v({ variant }), className)} {...props} />;
}
