import type { StoryCourse } from "@/lib/studyCheckpoint";

const TERMS: Record<StoryCourse, string[]> = {
  "english-basics": ["주어", "동사", "be동사", "현재형", "과거형", "미래", "의문문", "부정문", "관사", "복수형", "전치사", "발음", "철자", "I am", "you are", "she is", "Do you", "Are you"],
  rust: ["소유권", "이동", "빌림", "불변 참조", "가변 참조", "수명", "컴파일", "변수", "함수", "타입", "패턴 매칭", "Option", "Result", "String", "Vec", "enum", "struct", "trait", "async", "TCP", "UDP", "바이트 스트림", "메시지 경계"],
  cpp: ["컴파일", "실행 파일", "초기화", "타입", "반복문", "인덱스", "참조", "포인터", "수명", "RAII", "소유권", "vector", "span", "템플릿", "mutex", "백프레셔", "직렬화", "바이트 순서", "소켓", "connect", "accept", "send", "recv", "TCP", "UDP", "메시지 경계", "재시도", "타임아웃", "IPv6", "TLS", "디버거", "중단점", "CMake", "Sanitizer", "단위 테스트", "상태 기계", "버전", "MTU", "멱등성", "로그", "정상 종료", "stop_token", "jthread", "퍼징"],
  csharp: [".NET SDK", "Program.cs", "dotnet", "변수", "타입", "클래스", "메서드", "인터페이스", "예외", "IDisposable", "using", "async", "await", "Task", "HttpClient", "JSON", "Web API", "ASP.NET Core", "테스트"],
  sqld: ["엔터티", "속성", "관계", "기본키", "외래키", "정규화", "반정규화", "NULL", "JOIN", "GROUP BY", "HAVING", "WHERE", "SELECT", "ORDER BY", "인덱스", "트랜잭션", "집계", "서브쿼리", "뷰", "카티션", "유일성"],
  network: ["네트워크", "패킷", "프레임", "IP", "IPv4", "IPv6", "MAC", "DNS", "DHCP", "TCP", "UDP", "포트", "소켓", "라우터", "라우팅", "서브넷", "게이트웨이", "NAT", "HTTP", "HTTPS", "TLS", "방화벽", "대역폭", "지연", "재전송", "타임아웃", "혼잡 제어", "MTU"],
};

const patterns = Object.fromEntries(Object.entries(TERMS).map(([subject, terms]) => [
  subject,
  new RegExp(terms.sort((a, b) => b.length - a.length).map(term => term.replaceAll(".", "\\.")).join("|"), "giu"),
])) as Record<StoryCourse, RegExp>;

export default function StudyText({ text, subject }: { text: string; subject: StoryCourse }) {
  const pieces: React.ReactNode[] = [];
  const used = new Set<string>();
  let cursor = 0;
  for (const match of text.matchAll(patterns[subject])) {
    if (used.size >= 4) break;
    const word = match[0];
    const at = match.index;
    const before = text[at - 1] ?? "";
    const after = text[at + word.length] ?? "";
    if (/^[A-Za-z0-9_.]+$/.test(word) && (/[A-Za-z0-9_]/.test(before) || /[A-Za-z0-9_]/.test(after))) continue;
    if (used.has(word.toLocaleLowerCase())) continue;
    pieces.push(text.slice(cursor, at));
    pieces.push(<mark className="study-mark" key={at}>{word}</mark>);
    used.add(word.toLocaleLowerCase());
    cursor = at + word.length;
  }
  pieces.push(text.slice(cursor));
  return <>{pieces}</>;
}
