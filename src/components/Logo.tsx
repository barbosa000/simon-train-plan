import logo from "@/assets/logo.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={logo} alt="SimonMuscle" className="h-8 w-8" width={32} height={32} />
      <span className="font-display text-lg tracking-tight">SimonMuscle</span>
    </div>
  );
}
