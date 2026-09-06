import { cn } from "@/lib/utils";

interface LandingContainerProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
}

export function LandingContainer({
  className,
  children,
  ...props
}: LandingContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-5xl px-6 sm:px-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}
