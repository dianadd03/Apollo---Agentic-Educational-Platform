import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/context/AuthContext";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/library" replace />;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(values.email, values.password);
      navigate(location.state?.from || "/library", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="library-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="px-2">
          <p className="theme-accent-text text-sm uppercase tracking-[0.28em]">Apollo</p>
          <h1 className="theme-title mt-4 text-6xl font-semibold tracking-tight">A learning platform with a beautiful library surface.</h1>
          <p className="theme-copy mt-6 max-w-2xl text-lg leading-8">
            Search technical topics, save them like books, and keep each topic's learning level attached to that topic instead of the user profile.
          </p>
        </div>
        <div>
          <AuthForm
            mode="login"
            values={values}
            onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
          <p className="theme-copy mt-4 text-center text-sm">
            Need an account? <Link className="font-medium text-[#c29f60] hover:text-[var(--section-title-color)]" to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
