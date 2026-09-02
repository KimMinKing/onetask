"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { setAuth, isLoggedIn } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/");
      return;
    }
    setCheckingAuth(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    setLoading(true);
    try {
      const uiLanguage = navigator.language.toLowerCase().startsWith("zh") ? "zh" : "ko";
      const res = mode === "login"
        ? await authApi.login(username.trim(), password)
        : await authApi.signup(username.trim(), password, uiLanguage);
      setAuth({ username: res.username, is_master: res.is_master });
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-dvh bg-dark-400 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-jeok-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-dark-400 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-jeok-400 tracking-tight">onetask</h1>
          <p className="text-stone-600 text-xs mt-2">개인 학습 + 일정 대시보드</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              placeholder="아이디"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full bg-dark-200 border border-stone-700 focus:border-jeok-600 rounded-2xl px-5 py-4 text-stone-100 placeholder-stone-600 outline-none transition-colors text-sm"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full bg-dark-200 border border-stone-700 focus:border-jeok-600 rounded-2xl px-5 py-4 text-stone-100 placeholder-stone-600 outline-none transition-colors text-sm"
            />
          </div>

          {error && (
            <p className="text-jeok-400 text-xs px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full py-4 bg-jeok-600 hover:bg-jeok-500 disabled:bg-dark-200 disabled:text-stone-600 text-white font-bold rounded-2xl transition-all mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                처리 중...
              </span>
            ) : mode === "login" ? "로그인" : "계정 만들기"}
          </button>
        </form>

        <div className="text-center mt-6">
          {mode === "login" ? (
            <button onClick={() => { setMode("signup"); setError(""); }}
              className="text-stone-600 hover:text-stone-400 text-xs transition-colors">
              계정 만들기
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-stone-700 text-xs">첫 번째 계정은 자동으로 마스터 계정이 됩니다</p>
              <button onClick={() => { setMode("login"); setError(""); }}
                className="text-stone-600 hover:text-stone-400 text-xs transition-colors">
                로그인으로 돌아가기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
