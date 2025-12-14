import { useState } from "react";
import { Button, Field, Input, Label } from "@headlessui/react";
import { useAuth } from "../hooks/useAuth";

export function LoginForm() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="mx-4 w-full max-w-md">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">
              ⚔️ Character Sheets
            </h1>
            <p className="text-slate-400">
              {isRegister ? "Create your account" : "Welcome back, adventurer"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Field>
              <Label
                htmlFor="username"
                className="mb-2 block cursor-default text-sm font-medium text-slate-300"
              >
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full cursor-text rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-white placeholder-slate-500 transition hover:border-slate-500 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none data-[focus]:border-purple-500"
                placeholder="Enter your username"
                required
              />
            </Field>

            <Field>
              <Label
                htmlFor="password"
                className="mb-2 block cursor-default text-sm font-medium text-slate-300"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full cursor-text rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-white placeholder-slate-500 transition hover:border-slate-500 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none data-[focus]:border-purple-500"
                placeholder="Enter your password"
                required
              />
            </Field>

            {error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:from-purple-500 hover:to-pink-500 hover:shadow-purple-500/25 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
            >
              {isLoading
                ? "Loading..."
                : isRegister
                  ? "Create Account"
                  : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              onClick={() => setIsRegister(!isRegister)}
              className="cursor-pointer rounded px-2 py-1 text-sm text-purple-400 transition hover:text-purple-300 hover:underline focus:ring-2 focus:ring-purple-400 focus:outline-none"
            >
              {isRegister
                ? "Already have an account? Sign in"
                : "Don't have an account? Register"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
