import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[100px] z-0 rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 blur-[100px] z-0 rounded-full" />
      
      <div className="z-10 w-full max-w-md flex flex-col items-center">
        <Link href="/" className="flex items-center gap-2 mb-8 group">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-shadow">
            <div className="w-3 h-3 rounded-full bg-black" />
          </div>
          <span className="text-2xl font-bold tracking-tighter">Orbit</span>
        </Link>
        
        {children}
      </div>
      
      <div className="absolute bottom-8 z-10 flex items-center gap-2 text-xs text-neutral-500">
        <Sparkles size={12} />
        <span>Powered by Galaxy Studio</span>
      </div>
    </div>
  );
}
