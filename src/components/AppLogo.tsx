import logoSrc from "@/assets/logo.png";

interface AppLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "h-4 w-4",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-20 w-20",
};

export default function AppLogo({ size = "md", className = "" }: AppLogoProps) {
  return (
    <img
      src={logoSrc}
      alt="ÇakmakKoçluk Logo"
      className={`${sizeMap[size]} rounded-full object-cover ${className}`}
      draggable={false}
    />
  );
}
