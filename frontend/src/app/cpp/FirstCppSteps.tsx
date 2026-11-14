const commandParts = [
  ["g++", "C++ 소스 코드를 실행 파일로 바꾸는 컴파일러를 부르는 명령입니다. 이 명령이 설치되어 있어야 터미널에서 사용할 수 있습니다."],
  ["-std=c++20", "C++20 문법을 기준으로 검사하고 컴파일하라는 옵션입니다. 오늘의 짧은 예제에는 꼭 필요하지 않지만, 뒤의 수업과 기준을 맞춥니다."],
  ["-Wall", "자주 생기는 실수를 경고로 알려 달라는 옵션입니다. Wall은 '모든 경고'라는 뜻처럼 보이지만 실제 모든 경고를 켜지는 않습니다."],
  ["-Wextra", "-Wall에 더해 추가 경고를 켭니다."],
  ["-Wpedantic", "선택한 C++ 표준에 맞지 않는 확장 문법을 경고합니다."],
  ["main.cpp", "내가 만든 입력 파일의 이름입니다. 터미널이 현재 보고 있는 폴더에 이 파일이 있어야 합니다."],
  ["-o app.exe", "-o는 '결과 파일 이름을 정한다'는 옵션입니다. Windows에서는 app.exe, Linux에서는 app처럼 이름을 붙일 수 있습니다."],
] as const;

function Command({ children }: { children: string }) {
  return <pre className="mt-2 overflow-x-auto rounded-xl bg-black/40 px-4 py-3 text-xs leading-6 text-emerald-300">{children}</pre>;
}

export default function FirstCppSteps() {
  return <section className="space-y-5 rounded-2xl border border-cyan-900/50 bg-cyan-950/10 p-5 text-sm leading-7 text-stone-200">
    <h3 className="text-lg font-bold text-cyan-200">정말 처음이라면: 파일부터 실행까지</h3>
    <div>
      <h4 className="font-bold text-stone-100">1. 무엇을 만드는 걸까?</h4>
      <p className="mt-1">소스 파일은 사람이 쓰는 설계도입니다. 편집기에서 새 파일을 만들고 위의 코드 전체를 복사해 <code>main.cpp</code>라는 이름으로 저장하세요. <code>.cpp</code>는 C++ 소스 파일이라는 표시입니다. 메모장으로 저장한다면 파일 형식을 ‘모든 파일’로 골라 <code>main.cpp.txt</code>가 되지 않게 확인하세요. 첫 줄의 <code>#include &lt;iostream&gt;</code>은 화면에 글자를 쓰는 도구를 가져옵니다. <code>main</code>은 프로그램이 시작하는 함수이고, <code>std::cout</code>은 글자를 화면에 출력합니다. <code>\n</code>은 줄을 바꾸고, <code>return 0;</code>은 정상 종료를 알립니다.</p>
    </div>
    <div>
      <h4 className="font-bold text-stone-100">2. 어디에 명령을 입력할까?</h4>
      <p className="mt-1">코드를 적는 편집기 화면과 명령을 입력하는 터미널은 다릅니다. 편집기에서 파일을 저장한 다음, 그 파일이 있는 폴더에서 터미널을 여세요. Windows라면 파일 탐색기에서 <code>main.cpp</code>가 보이는 폴더를 연 뒤 주소창에 <code>powershell</code>을 입력하고 Enter를 누를 수 있습니다. Linux나 macOS라면 그 폴더에서 터미널 앱을 여세요. 아래 회색 상자의 명령은 한 줄씩 입력하고 Enter를 누르세요. 앞에 <code>$</code> 같은 표시를 붙여 입력할 필요는 없습니다.</p>
      <p className="mt-2">먼저 <code>g++ --version</code>을 입력해 컴파일러가 있는지 확인하세요. 버전이 나오면 준비된 것입니다. 명령을 찾을 수 없다고 나오면 C++ 컴파일러를 설치하고 터미널에서 찾을 수 있게 설정해야 합니다. 이어서 Windows에서는 <code>dir</code>, Linux/macOS에서는 <code>ls</code>로 <code>main.cpp</code>가 보이는지 확인하세요.</p>
    </div>
    <div>
      <h4 className="font-bold text-stone-100">3. 먼저 가장 짧은 명령으로 실행하기</h4>
      <p className="mt-1">Windows PowerShell:</p>
      <Command>{"g++ main.cpp -o app.exe\n.\\app.exe"}</Command>
      <p className="mt-3">Linux 또는 g++가 설치된 macOS:</p>
      <Command>{"g++ main.cpp -o app\n./app"}</Command>
      <p className="mt-2">첫 줄은 컴파일해서 실행 파일을 만듭니다. 성공하면 아무 메시지도 안 나올 수 있습니다. 둘째 줄이 그 파일을 실행하며, <code>Hello, C++!</code>가 보여야 합니다. <code>.\</code>와 <code>./</code>는 모두 ‘지금 폴더에 있는’이라는 뜻이지만 운영체제의 경로 표기가 다릅니다. macOS에서 <code>g++</code>가 없고 <code>clang++</code>가 있다면 첫 줄의 <code>g++</code>만 <code>clang++</code>로 바꾸세요.</p>
    </div>
    <div>
      <h4 className="font-bold text-stone-100">4. 수업의 긴 명령 읽기</h4>
      <p className="mt-1">짧은 명령이 성공했다면 표준 버전과 경고 옵션을 붙여 다시 빌드해 보세요. 컴파일 명령과 실행 명령은 각각 별개의 한 줄입니다.</p>
      <p className="mt-2">Windows PowerShell:</p>
      <Command>{"g++ -std=c++20 -Wall -Wextra -Wpedantic main.cpp -o app.exe\n.\\app.exe"}</Command>
      <p className="mt-3">Linux 또는 g++가 설치된 macOS:</p>
      <Command>{"g++ -std=c++20 -Wall -Wextra -Wpedantic main.cpp -o app\n./app"}</Command>
      <dl className="mt-3 space-y-2">{commandParts.map(([part, meaning]) => <div key={part}><dt className="inline font-mono font-bold text-cyan-200">{part}</dt><dd className="inline"> — {meaning}</dd></div>)}</dl>
    </div>
    <div>
      <h4 className="font-bold text-stone-100">5. 막히면 오류가 난 위치부터 보기</h4>
      <p className="mt-1"><code>main.cpp: No such file or directory</code>는 터미널에서 보고 있는 폴더에 소스 파일이 없다는 뜻입니다. 파일을 저장한 폴더에서 터미널을 다시 여세요. <code>g++</code>를 찾을 수 없으면 컴파일러 설치나 경로 설정부터 확인하세요. 컴파일 단계에서 오류가 나면 실행 파일이 새로 만들어지지 않습니다. 이전에 만든 실행 파일이 남아 있을 수 있으니, 오류를 고친 뒤 첫 줄을 다시 실행하세요.</p>
      <p className="mt-2">이 과정을 마친 다음에 전처리, 컴파일, 링크를 나눠 배웁니다. 지금은 ‘소스 파일 저장 → 실행 파일 만들기 → 실행’의 순서만 확실히 알면 됩니다.</p>
    </div>
  </section>;
}
