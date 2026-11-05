import lightLogo from "@/assets/abhi-learning-hub-light.png.asset.json";
import darkLogo from "@/assets/abhi-learning-hub-dark.png.asset.json";
import { cn } from "@/lib/utils";

type BankLogoProps = {
  className?: string;
  variant?: "light" | "dark";
};

export function BankLogo({ className, variant = "light" }: BankLogoProps) {
  const logo = variant === "dark" ? darkLogo : lightLogo;

  return (
    <img
      src={logo.url}
      alt="ABHI Learning HUB — Learn the ABHI Way"
      className={cn("h-9 w-auto object-contain", className)}
    />
  );
}
