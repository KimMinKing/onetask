import type { StoryCourse } from "@/lib/studyCheckpoint";

type Diagram = {
  title: string;
  example: string;
  steps: [label: string, detail: string][];
  note: string;
};

// Only lessons with a concrete, verified relationship get a diagram.
const DIAGRAMS: Partial<Record<StoryCourse, Record<number, Diagram>>> = {
  "english-basics": {
    1: {
      title: "영어 문장을 왼쪽부터 읽기",
      example: "I need water.",
      steps: [["I", "누가? → 나(주어)"], ["need", "무엇을 하나? → 필요하다(동사)"], ["water", "무엇을? → 물(목적어)"]],
      note: "영어 단어의 자리부터 읽고, 그다음 자연스러운 한국어로 옮겨 보세요.",
    },
    3: {
      title: "누구인지에 따라 be동사 고르기",
      example: "I am / you are / she is",
      steps: [["I am", "내 상태나 정체"], ["you are", "듣는 사람의 상태나 정체"], ["she is", "다른 한 사람의 상태나 정체"]],
      note: "be동사 뒤에 직업이나 상태를 놓는 예입니다. 'I guide you'의 guide는 행동을 말하는 일반동사입니다.",
    },
    4: {
      title: "a와 the가 가리키는 열쇠",
      example: "Bring a key. → Bring the key.",
      steps: [["a key", "처음에는 어느 열쇠든 하나"], ["열쇠를 고름", "둘 다 어떤 열쇠인지 알게 됨"], ["the key", "이제 바로 그 열쇠"]],
      note: "a와 the의 선택은 이 장면에서 말하는 사람과 듣는 사람이 무엇을 아는지에 달려 있어요.",
    },
  },
  rust: {
    13: {
      title: "String 변수와 글자 버퍼",
      example: "let text = String::from(\"hello\");",
      steps: [["text 변수", "버퍼를 가리키는 정보가 있음"], ["글자 버퍼", "hello의 바이트가 힙에 저장됨"], ["범위 끝", "소유자인 text의 정리 규칙이 적용됨"]],
      note: "이 그림은 String의 대표적인 배치를 단순화한 것입니다. 모든 Rust 값이 힙에 놓이는 것은 아닙니다.",
    },
    15: {
      title: "String의 소유권 이동",
      example: "let a = String::from(\"rust\"); let b = a;",
      steps: [["a가 소유", "처음에는 a가 문자열 버퍼를 맡음"], ["b = a", "버퍼의 소유권이 b로 이동"], ["이동 후", "b는 사용 가능, a는 사용 불가"]],
      note: "정수처럼 Copy가 구현된 값은 복사될 수 있습니다. 이 그림은 String의 이동을 보여 줍니다.",
    },
    17: {
      title: "읽기 전용으로 빌리기",
      example: "length(&name)",
      steps: [["name 소유", "문자열의 소유자는 그대로 name"], ["&name 전달", "함수는 잠시 읽을 수만 있음"], ["호출 뒤", "name을 다시 사용할 수 있음"]],
      note: "빌림은 소유권 이동과 다릅니다. 참조가 유효한 동안 원본의 수명도 유지돼야 합니다.",
    },
  },
  cpp: {
    1: {
      title: "저장·컴파일·실행은 세 행동",
      example: "main.cpp → g++ → app.exe → 실행",
      steps: [["파일 저장", "C++ 소스를 main.cpp에 저장"], ["컴파일", "g++가 실행 파일을 만듦"], ["실행", "만들어진 프로그램을 따로 실행"]],
      note: "Windows는 보통 app.exe, Linux/macOS는 app처럼 실행 파일 이름과 명령이 달라질 수 있습니다.",
    },
    19: {
      title: "TCP는 받은 만큼만 앞으로",
      example: "4바이트를 보냈어도 recv 한 번에 4바이트가 온다는 보장은 없습니다.",
      steps: [["보낸 데이터", "A B C D · 총 4바이트"], ["첫 recv", "A · 1바이트 수신, done = 1"], ["이후 recv", "2바이트와 1바이트를 받아 done = 4"]],
      note: "실제 분할 크기와 호출 횟수는 매번 달라질 수 있습니다. 반환된 바이트 수를 누적하세요.",
    },
    20: {
      title: "바이트 흐름에서 메시지 경계 찾기",
      example: "[4바이트 길이=3][A B C][4바이트 길이=2][D E]",
      steps: [["길이 읽기", "첫 메시지 본문은 3바이트"], ["본문 모으기", "A B C가 모이면 한 메시지 완료"], ["다음 길이", "2를 읽고 D E를 다음 메시지로 처리"]],
      note: "TCP가 메시지 경계를 알려 주는 것은 아닙니다. 송신자와 수신자가 같은 형식을 약속해야 합니다.",
    },
  },
  csharp: {
    1: {
      title: "첫 C# 프로젝트의 순서",
      example: "dotnet new console → Program.cs → dotnet run",
      steps: [["프로젝트 생성", "dotnet new console로 파일을 만듦"], ["코드 저장", "Program.cs에 출력 문장을 적음"], ["빌드·실행", "dotnet run으로 결과를 확인"]],
      note: ".NET SDK를 먼저 설치하고, 프로젝트 폴더에서 명령을 실행해야 합니다.",
    },
    15: {
      title: "await 앞과 뒤의 흐름",
      example: "await Task.Delay(100);",
      steps: [["작업 시작", "Task가 아직 끝나지 않음"], ["await", "메서드는 이어서 할 지점을 남기고 기다림"], ["작업 완료", "기다리던 뒤쪽 코드가 이어서 실행됨"]],
      note: "await가 반드시 새 스레드를 만드는 것은 아닙니다. 작업 완료와 실행 흐름을 구분하세요.",
    },
  },
  sqld: {
    4: {
      title: "데이터 모델을 세 번 구체화하기",
      example: "개념 모델 → 논리 모델 → 물리 모델",
      steps: [["개념", "업무의 핵심 엔터티와 관계"], ["논리", "속성·식별자·정규화, DBMS와 독립"], ["물리", "특정 DBMS의 테이블·타입·인덱스"]],
      note: "논리 단계에서 특정 DBMS의 저장 공간과 인덱스를 확정한다고 외우면 틀립니다.",
    },
    48: {
      title: "LEFT JOIN은 왼쪽 행을 남긴다",
      example: "부서 LEFT JOIN 직원 ON 부서 번호가 같음",
      steps: [["왼쪽 부서", "부서 1, 부서 2가 있음"], ["오른쪽 직원", "부서 2에만 직원이 있음"], ["결과", "부서 1 + NULL / 부서 2 + 직원"]],
      note: "예시는 각 부서에 직원이 최대 한 명인 경우입니다. 오른쪽 행이 여러 개 매칭되면 결과 행도 늘어납니다.",
    },
    54: {
      title: "NOT IN에 NULL이 섞이면",
      example: "x NOT IN (1, NULL)",
      steps: [["비교 시작", "x가 1이면 거짓"], ["다른 x", "NULL과의 비교가 UNKNOWN"], ["WHERE 결과", "TRUE가 아니므로 행이 남지 않을 수 있음"]],
      note: "NULL 가능성이 있으면 목록에서 제외하거나 NOT EXISTS로 의도를 분명히 하세요.",
    },
  },
  network: {
    5: {
      title: "보낼 때 붙이고, 받을 때 벗기기",
      example: "상위 데이터가 아래 계층으로 내려가며 헤더가 붙습니다.",
      steps: [["송신", "계층별로 필요한 헤더를 추가"], ["전송", "비트가 매체를 건너 이동"], ["수신", "계층을 올라가며 헤더를 해석·제거"]],
      note: "계층마다 PDU 이름과 헤더 내용이 다릅니다. 실제 패킷을 볼 때 어느 계층인지 함께 확인하세요.",
    },
    40: {
      title: "TCP 연결의 세 메시지",
      example: "클라이언트 ↔ 서버",
      steps: [["1. SYN →", "클라이언트가 연결을 요청"], ["2. ← SYN/ACK", "서버가 요청을 받고 응답"], ["3. ACK →", "클라이언트가 확인"]],
      note: "화살표는 이 그림에서 클라이언트가 왼쪽, 서버가 오른쪽일 때의 방향입니다.",
    },
    43: {
      title: "UDP의 경계와 전달은 별개",
      example: "데이터그램 A / 데이터그램 B",
      steps: [["두 장 보냄", "A와 B를 각각 한 데이터그램으로 전송"], ["받는 쪽", "도착한 데이터그램의 경계는 구분"], ["보장은 없음", "A나 B의 도착과 순서는 보장되지 않음"]],
      note: "경계 보존은 '한 번 보낸 것이 반드시 도착한다'는 뜻이 아닙니다.",
    },
  },
};

export default function StudyDiagram({ subject, step }: { subject: StoryCourse; step: number }) {
  const diagram = DIAGRAMS[subject]?.[step];
  if (!diagram) return null;
  return <figure className="study-diagram" aria-label={diagram.title}>
    <figcaption><span>그림으로 한 번 더</span><strong>{diagram.title}</strong><p>{diagram.example}</p></figcaption>
    <ol>{diagram.steps.map(([label, detail], index) => <li key={label}>
      <span className="study-diagram-number">{String(index + 1).padStart(2, "0")}</span>
      <strong>{label}</strong><small>{detail}</small>
    </li>)}</ol>
    <p className="study-diagram-note">{diagram.note}</p>
  </figure>;
}
