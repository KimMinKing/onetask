import Link from "next/link";

const commandClass = "overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-6 text-emerald-300";

export default function CppLabPage() {
  return <main className="min-h-dvh bg-dark-400 px-4 py-8 text-stone-100">
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/cpp" className="text-sm text-cyan-300 hover:underline">← C++ 코스로 돌아가기</Link>
      <header>
        <p className="text-xs font-bold text-cyan-400">실행 실습 · 127.0.0.1 전용</p>
        <h1 className="mt-2 text-3xl font-black">C++ TCP/UDP 에코 실습</h1>
        <p className="mt-3 text-sm leading-7 text-stone-300">TCP의 부분 송수신과 메시지 길이 처리, UDP의 데이터그램 경계를 직접 확인합니다. 서버는 요청 한 건을 처리하고 종료합니다.</p>
      </header>
      <section className="rounded-3xl border border-cyan-900/50 bg-cyan-950/20 p-5">
        <h2 className="font-bold">전체 프로젝트 받기</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">소스, CMake 설정, 자동 검사, 실행 안내가 한 파일에 들어 있습니다.</p>
        <a href="/examples/cpp-network/cpp-network-lab.zip" download className="mt-4 inline-block rounded-xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white hover:bg-cyan-500">실습 프로젝트 ZIP 다운로드</a>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-cyan-300">
          <a href="/examples/cpp-network/socket_lab.cpp" download className="hover:underline">Linux 소스만 받기</a>
          <a href="/examples/cpp-network/socket_lab_windows.cpp" download className="hover:underline">Windows 소스만 받기</a>
          <a href="/examples/cpp-network/address_lookup.cpp" download className="hover:underline">IPv4/IPv6 주소 조회 소스 받기</a>
        </div>
      </section>
      <section className="rounded-3xl bg-dark-200 p-5 sm:p-7">
        <h2 className="text-xl font-bold">1. 압축 해제 후 빌드</h2>
        <p className="mt-2 text-sm text-stone-400">CMake, C++20 컴파일러, 검사 실행용 Python 3이 필요합니다. Windows는 Visual Studio C++ 도구 모음 또는 MinGW-w64를 사용할 수 있습니다.</p>
        <pre className={`mt-4 ${commandClass}`}>cmake -S . -B build{"\n"}cmake --build build --config Release{"\n"}ctest --test-dir build -C Release --output-on-failure</pre>
      </section>
      <section className="rounded-3xl bg-dark-200 p-5 sm:p-7">
        <h2 className="text-xl font-bold">2. 서버와 클라이언트 실행</h2>
        <p className="mt-2 text-sm text-stone-400">각 쌍을 서로 다른 터미널에서 실행합니다. Linux/WSL의 실행 파일 이름은 <code>socket_lab</code>, Windows는 <code>socket_lab.exe</code>입니다.</p>
        <pre className={`mt-4 ${commandClass}`}># 터미널 1{"\n"}./build/socket_lab tcp-server{"\n"}# 터미널 2{"\n"}./build/socket_lab tcp-client hello{"\n"}{"\n"}# 터미널 1{"\n"}./build/socket_lab udp-server{"\n"}# 터미널 2{"\n"}./build/socket_lab udp-client hello</pre>
        <p className="mt-3 text-xs leading-6 text-stone-500">Windows Visual Studio 다중 구성 빌드에서는 실행 파일이 <code>build/Release/socket_lab.exe</code>에 생성될 수 있습니다.</p>
      </section>
      <section className="rounded-3xl bg-dark-200 p-5 sm:p-7">
        <h2 className="text-xl font-bold">3. 결과 살펴보기</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-300">
          <li>TCP 소스의 <code>send_all</code>과 <code>recv_exact</code>가 반환된 실제 바이트 수만큼 진행하는지 확인합니다.</li>
          <li>4바이트 길이 접두부를 읽은 뒤 4096바이트 제한을 검사하는 위치를 찾습니다.</li>
          <li>UDP 소스의 <code>recvfrom</code>이 발신 주소와 데이터그램 하나를 받는 흐름을 확인합니다.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-cyan-300"><Link href="/cpp?step=19" className="hover:underline">부분 송수신 복습 →</Link><Link href="/cpp?step=20" className="hover:underline">프레이밍 복습 →</Link><Link href="/cpp?step=21" className="hover:underline">UDP 복습 →</Link></div>
      </section>
      <section className="rounded-3xl bg-dark-200 p-5 sm:p-7">
        <h2 className="text-xl font-bold">IPv4/IPv6 주소 조회</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300"><code>getaddrinfo</code>로 TCP 접속 후보 주소를 찾고, <code>inet_ntop</code>으로 IPv4와 IPv6 주소를 출력합니다. 이 예제는 주소만 조회하며 외부 서버에 접속하지 않습니다.</p>
        <pre className={`mt-4 ${commandClass}`}>./build/address_lookup --numeric 127.0.0.1 40404{"\n"}./build/address_lookup --numeric ::1 40404</pre>
        <p className="mt-3 text-xs leading-6 text-stone-500">Windows Visual Studio 빌드에서는 <code>build/Release/address_lookup.exe</code>를 실행하세요.</p>
      </section>
      <p className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm leading-6 text-amber-200">이 예제는 로컬 학습용 평문 프로그램입니다. 외부 주소에 바인딩하거나 운영 서버로 배포하지 마세요.</p>
    </div>
  </main>;
}
