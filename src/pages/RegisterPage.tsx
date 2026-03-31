import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/context/AuthContext";

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/library" replace />;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await register(values.name, values.email, values.password);
      navigate("/library", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="library-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center relative z-10">
        <div className="px-2">
          <p className="text-sm uppercase tracking-[0.28em] text-[#a3835b]">Apollo</p>
          <h1 className="mt-4 text-6xl font-semibold tracking-tight text-[#f4ead6] font-serif">Create a study account, then organize every topic like a premium shelf entry.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#dccfa6]/80">
            Registration stays simple. The learning level is chosen later for each topic you save.
          </p>
        </div>
        <div>
          <AuthForm
            mode="register"
            values={values}
            onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
          <p className="mt-4 text-center text-sm text-[#dccfa6]/60">
            Already registered? <Link className="text-[#c29f60] hover:text-[#f4ead6] transition-colors" to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

