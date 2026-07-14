"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getUser, clearAuth } from "@/lib/auth";

interface AdminData {
  words: {
    zh: { total: number; by_level: Record<string, number>; reviewed: number };
    en: { total: number; by_level: Record<string, number>; reviewed: number };
    ja: { total: number; by_level: Record<string, number>; reviewed: number };
  };
  tasks: { todo: number; done: number };
  calendar: { total: number };
  users: { id: number; username: string; is_master: boolean; ui_language: string }[];
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("jsy11");
  const [newPassword, setNewPassword] = useState("jsy11");
  const [newLanguage, setNewLanguage] = useState<"ko" | "zh">("zh");
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const user = getUser();

  useEffect(() => {
    if (!user?.is_master) { router.replace("/"); return; }
    api.admin.overview()
      .then(setData)
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, []);

  const logout = () => { clearAuth(); router.replace("/login"); };

  const createUser = async () => {
    setCreateStatus(null);
    setCreating(true);
    try {
      const created = await api.admin.createUser({
        username: newUsername,
        password: newPassword,
        ui_language: newLanguage,
      });
      setData((prev) => prev ? { ...prev, users: [...prev.users, created] } : prev);
      setCreateStatus(`✓ @${created.username} 계정 생성 완료`);
      setNewUsername("");
      setNewPassword("");
      setNewLanguage("zh");
    } catch (error) {
      setCreateStatus(error instanceof Error ? `✗ ${error.message}` : "✗ 계정 생성 실패");
    } finally {
      setCreating(false);
    }
  };

  const sendTestPush = async () => {
    setPushStatus("전송 중...");
    try {
      const result = await api.push.test();
      setPushStatus(`✓ ${result.sent}개 디바이스에 전송됨`);
    } catch {
      setPushStatus("✗ 전송 실패 (구독된 디바이스 없음?)");
    }
    setTimeout(() => setPushStatus(null), 3000);
  };

  if (loading) return (
    <div className="min-h-dvh bg-dark-400 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-jeok-500 border-t-transparent animate-spin" />
    </div>
  );

  if (!data) return null;

  const totalWords = data.words.zh.total + data.words.en.total + data.words.ja.total;
  const totalReviewed = data.words.zh.reviewed + data.words.en.reviewed + data.words.ja.reviewed;

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      {/* 헤더 */}
      <div className="px-6 pt-10 pb-6 bg-dark-300 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="w-8 h-8 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-all">
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold text-jeok-400">master</h1>
              <p className="text-stone-600 text-xs mt-0.5">@{user?.username}</p>
            </div>
          </div>
          <button onClick={logout}
            className="text-xs text-stone-600 hover:text-stone-400 transition-colors px-3 py-2">
            로그아웃
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">

        {/* 요약 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-dark-200 border border-white/5 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{totalWords.toLocaleString()}</p>
            <p className="text-xs text-stone-600 mt-0.5">전체 단어</p>
          </div>
          <div className="bg-dark-200 border border-white/5 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-jeok-400">{totalReviewed.toLocaleString()}</p>
            <p className="text-xs text-stone-600 mt-0.5">복습 완료</p>
          </div>
          <div className="bg-dark-200 border border-white/5 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{data.tasks.todo + data.tasks.done}</p>
            <p className="text-xs text-stone-600 mt-0.5">전체 할일</p>
          </div>
        </div>

        {/* 중국어 */}
        <Section title="중국어 (HSK)" icon="中" total={data.words.zh.total} reviewed={data.words.zh.reviewed}>
          {Object.entries(data.words.zh.by_level).sort(([a], [b]) => Number(a) - Number(b)).map(([lvl, cnt]) => (
            <LevelRow key={lvl} label={`HSK ${lvl}`} count={cnt} />
          ))}
        </Section>

        {/* 영어 */}
        <Section title="영어 (CEFR)" icon="En" total={data.words.en.total} reviewed={data.words.en.reviewed}>
          {["A1","A2","B1","B2","C1"].map((lvl) => (
            <LevelRow key={lvl} label={lvl} count={data.words.en.by_level[lvl] ?? 0} />
          ))}
        </Section>

        {/* 일본어 */}
        <Section title="일본어 (JLPT)" icon="日" total={data.words.ja.total} reviewed={data.words.ja.reviewed}>
          {["N5","N4","N3","N2","N1"].map((lvl) => (
            <LevelRow key={lvl} label={lvl} count={data.words.ja.by_level[lvl] ?? 0} />
          ))}
        </Section>

        {/* 할일 + 캘린더 */}
        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4 space-y-2">
          <p className="text-xs text-stone-600 font-medium mb-3">기타</p>
          <StatRow label="진행 중 할일" value={`${data.tasks.todo}개`} />
          <StatRow label="완료된 할일" value={`${data.tasks.done}개`} />
          <StatRow label="캘린더 일정" value={`${data.calendar.total}개`} />
        </div>

        {/* 푸시 알림 */}
        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4">
          <p className="text-xs text-stone-600 font-medium mb-3">푸시 알림</p>
          <button onClick={sendTestPush}
            className="w-full py-3 rounded-xl bg-jeok-700 hover:bg-jeok-600 text-white text-sm font-medium transition-colors">
            테스트 알림 발송
          </button>
          {pushStatus && (
            <p className="text-xs text-stone-400 mt-2 text-center">{pushStatus}</p>
          )}
        </div>

        {/* 계정 생성 */}
        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4">
          <p className="text-xs text-stone-600 font-medium mb-3">계정 생성</p>
          <div className="space-y-2">
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="아이디"
              className="w-full bg-dark-300 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-jeok-700"
            />
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="비밀번호"
              type="password"
              className="w-full bg-dark-300 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-jeok-700"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setNewLanguage("zh")}
                className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${newLanguage === "zh" ? "bg-jeok-800 border-jeok-600 text-white" : "bg-dark-300 border-white/10 text-stone-500"}`}
              >
                중국어 UI
              </button>
              <button
                onClick={() => setNewLanguage("ko")}
                className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${newLanguage === "ko" ? "bg-jeok-800 border-jeok-600 text-white" : "bg-dark-300 border-white/10 text-stone-500"}`}
              >
                한국어 UI
              </button>
            </div>
            <button
              onClick={createUser}
              disabled={creating || !newUsername.trim() || newPassword.length < 4}
              className="w-full py-3 rounded-xl bg-jeok-700 hover:bg-jeok-600 disabled:bg-dark-300 disabled:text-stone-700 text-white text-sm font-medium transition-colors"
            >
              {creating ? "생성 중..." : "일반 유저 생성"}
            </button>
            {createStatus && (
              <p className="text-xs text-stone-400 text-center">{createStatus}</p>
            )}
          </div>
        </div>

        {/* 유저 목록 */}
        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4">
          <p className="text-xs text-stone-600 font-medium mb-3">계정 목록</p>
          <div className="space-y-2">
            {data.users.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <span className="text-sm text-stone-300">@{u.username}</span>
                <span className="text-xs text-stone-600 border border-white/5 rounded px-1.5 py-0.5">{u.ui_language === "zh" ? "中文" : "한국어"}</span>
                {u.is_master && (
                  <span className="text-xs text-jeok-400 border border-jeok-900 rounded px-1.5 py-0.5">master</span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function Section({ title, icon, total, reviewed, children }: {
  title: string; icon: string; total: number; reviewed: number; children: React.ReactNode;
}) {
  return (
    <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-jeok-900 flex items-center justify-center text-sm font-bold text-jeok-400">{icon}</span>
          <p className="text-sm font-bold text-stone-200">{title}</p>
        </div>
        <p className="text-xs text-stone-600">{total.toLocaleString()}개 · 복습 {reviewed}</p>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function LevelRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-stone-500">{label}</span>
      <span className="text-xs font-medium text-stone-300">{count.toLocaleString()}개</span>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone-500">{label}</span>
      <span className="text-sm font-medium text-stone-300">{value}</span>
    </div>
  );
}
