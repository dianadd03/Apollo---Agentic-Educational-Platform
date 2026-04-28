import { BookOpenCheck, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/models";

type AuthFormProps = {
  mode: "login" | "register";
  values: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
  };
  onChange: (field: "name" | "email" | "password" | "role", value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
};

export function AuthForm({ mode, values, onChange, onSubmit, loading, error }: AuthFormProps) {
  return (
    <div className="glass-panel w-full max-w-md p-8 bg-[#161820]/90 border border-[#c29f60]/20 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#c29f60,#8a6d3b)] text-[#12141a] shadow-[0_10px_24px_rgba(194,159,96,0.2)]">
          <BookOpenCheck className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-[#a3835b]">Apollo</p>
          <h1 className="text-3xl font-semibold text-[#f4ead6] font-serif">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        </div>
      </div>

      <div className="space-y-4">
        {mode === "register" ? (
          <>
            <Input placeholder="Full name" value={values.name} onChange={(event) => onChange("name", event.target.value)} />
            <select
              className="w-full rounded-2xl border border-[#c29f60]/20 bg-[#12141a]/80 px-4 py-3 text-sm text-[#f4ead6]"
              value={values.role ?? "student"}
              onChange={(event) => onChange("role", event.target.value)}
            >
              <option value="student">Student</option>
              <option value="professor">Professor</option>
              <option value="admin">Admin</option>
            </select>
          </>
        ) : null}
        <Input placeholder="Email address" type="email" value={values.email} onChange={(event) => onChange("email", event.target.value)} />
        <Input placeholder="Password" type="password" value={values.password} onChange={(event) => onChange("password", event.target.value)} />
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-[#4e1c24]/50 bg-[#2a0e12] px-4 py-3 text-sm text-[#c26060]">{error}</div> : null}

      <Button className="mt-6 w-full" onClick={onSubmit} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {mode === "login" ? "Enter Apollo" : "Create account"}
      </Button>
    </div>
  );
}
