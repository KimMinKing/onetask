export interface RustLesson {
  id: number;
  section: string;
  title: string;
  idea: string;
  detail: string;
  code: string;
  tryIt: string;
  check: string;
  answer: string;
}

type Row = [string, string, string, string, string, string, string, string];

// Each step asks for an explanation before revealing the answer. Snippets show
// the key lines; put expression fragments inside main and TOML in Cargo.toml.
const rows: Row[] = [
  ["첫 실행", "Rust가 해결하려는 문제", "값의 소유자와 사용 가능 범위를 컴파일할 때 확인해 메모리 오류를 줄인다.", "실행 중에 수거기가 메모리를 뒤지는 방식이 아니다. 안전한 코드를 기본으로 하고 위험한 경계만 명시적으로 분리한다.", "fn main() { println!(\"안녕, Rust!\"); }", "문장을 바꿔 실행하고 컴파일 오류와 실행 결과를 구분해 적는다.", "Rust의 소유권 검사는 언제 일어날까?", "주로 컴파일할 때 일어난다."],
  ["첫 실행", "도구 설치와 버전", "rustup은 도구 체인을 관리하고 rustc는 컴파일러, cargo는 프로젝트 도구다.", "새 프로젝트는 cargo new hello로 만들고 cargo run으로 빌드와 실행을 한 번에 한다.", "rustc --version\ncargo --version\ncargo new hello\ncd hello\ncargo run", "버전을 확인하고 hello의 src/main.rs를 한 줄 수정한다.", "cargo run과 rustc의 역할 차이는?", "cargo는 프로젝트 빌드·실행을 관리하고 rustc는 소스를 컴파일한다."],
  ["첫 실행", "Cargo 프로젝트 지도", "Cargo.toml은 패키지 설정, src/main.rs는 실행 시작점이다.", "Cargo.lock은 사용한 의존성 버전을 기록한다. 실행 프로그램에서는 보통 저장소에 함께 둔다.", "[package]\nname = \"hello\"\nversion = \"0.1.0\"\nedition = \"2024\"", "main.rs와 Cargo.toml의 역할을 직접 설명한다.", "의존성 버전 잠금은 어디에 기록될까?", "Cargo.lock에 기록된다."],
  ["첫 실행", "표현식과 세미콜론", "Rust의 블록은 마지막 표현식의 값을 돌려줄 수 있다.", "끝에 세미콜론을 붙이면 값이 없는 문장으로 바뀐다. 반환형이 i32인데 끝이 문장이면 타입 오류가 난다.", "fn double(x: i32) -> i32 {\n    x * 2\n}", "마지막 줄에 세미콜론을 붙여 오류를 보고 다시 제거한다.", "x * 2 뒤의 세미콜론을 지우는 이유는?", "블록의 마지막 표현식 값을 반환하기 위해서다."],
  ["첫 실행", "let과 mut", "변수는 기본적으로 바꿀 수 없다. 변경이 필요할 때만 mut를 붙인다.", "재할당과 새 변수를 선언하는 그림자 변수는 다르다. 그림자는 같은 이름으로 다른 타입도 가질 수 있다.", "let score = 3;\nlet score = score + 1;\nlet mut count = 0;\ncount += 1;", "count에서 mut를 지워 보고 컴파일러가 가리키는 위치를 찾는다.", "그림자 변수와 mut의 차이는?", "그림자는 새 바인딩을 만들고 mut는 같은 바인딩의 값을 바꾼다."],
  ["첫 실행", "함수와 타입 읽기", "함수의 인자와 반환형을 보고 데이터 흐름을 먼저 예측한다.", "인자는 `이름: 타입`, 반환형은 `-> 타입`으로 쓴다. 반환할 값이 없으면 단위 타입 ()이다.", "fn add(a: i32, b: i32) -> i32 { a + b }\nfn main() { println!(\"{}\", add(2, 3)); }", "add(2, 3)의 출력과 add(2, -3)의 출력을 손으로 구한다.", "add의 반환형은 무엇인가?", "i32다."],

  ["값과 흐름", "정수·실수·bool", "i32는 부호 있는 32비트 정수이고 f64는 기본 실수 타입이다.", "서로 다른 수 타입은 암묵적으로 섞이지 않는다. 범위를 넘는 연산은 의도에 따라 검사하거나 명시적 변환을 한다.", "let amount: i32 = 42;\nlet ratio: f64 = 0.5;\nlet ready: bool = amount > 0;", "정수와 실수를 바로 더하려고 할 때의 오류를 확인한다.", "i32와 f64를 자동으로 더하지 않는 이유는?", "서로 다른 타입이라 명시적인 변환이 필요하기 때문이다."],
  ["값과 흐름", "if도 값을 만든다", "if는 조건에 따라 값을 선택하는 표현식이다.", "각 갈래에서 나온 값의 타입이 같아야 한다. 조건은 숫자가 아니라 bool이어야 한다.", "let score = 80;\nlet grade = if score >= 60 { \"통과\" } else { \"재시도\" };", "else를 정수 0으로 바꾸고 타입 오류를 읽는다.", "if의 두 갈래 타입은 왜 같아야 할까?", "하나의 변수에 들어갈 결과 타입이 정해져야 하기 때문이다."],
  ["값과 흐름", "loop·while·for", "횟수가 정해지면 for, 조건이 정해지면 while을 고른다.", "범위 0..3은 0, 1, 2를 만든다. 0..=3은 3까지 포함한다.", "for n in 0..3 { println!(\"{n}\"); }", "0..3과 0..=3의 출력 횟수를 비교한다.", "0..3에 3이 포함될까?", "포함되지 않는다."],
  ["값과 흐름", "match와 패턴", "match는 가능한 갈래를 빠짐없이 다뤄야 한다.", "패턴마다 동작을 적고 나머지는 _로 묶을 수 있다. 갈래의 결과 타입도 서로 맞아야 한다.", "let digit = 2;\nlet name = match digit { 1 => \"하나\", 2 => \"둘\", _ => \"기타\" };", "_ 갈래를 지워 보고 컴파일 오류를 읽는다.", "match에서 _의 역할은?", "앞선 패턴이 다루지 않은 나머지 값을 받는다."],
  ["값과 흐름", "튜플과 배열", "튜플은 서로 다른 타입을 묶고 배열은 같은 타입을 고정 길이로 담는다.", "인덱스는 0부터 시작한다. 배열 밖 인덱스는 컴파일 시 또는 실행 시 거부된다.", "let pair = (\"age\", 20);\nlet nums = [2, 4, 6];\nprintln!(\"{} {}\", pair.1, nums[0]);", "pair.0과 nums[2]를 출력해 본다.", "[2, 4, 6]의 마지막 인덱스는?", "2다."],
  ["값과 흐름", "String과 &str 첫 구분", "String은 늘릴 수 있는 소유 문자열이고 &str은 문자열 내용을 빌려 보는 뷰다.", "문자열 리터럴은 보통 &str이다. 새 글자를 덧붙일 때는 String을 만든다.", "let mut text = String::from(\"hi\");\ntext.push_str(\"!\");\nprintln!(\"{text}\");", "String::from을 빼면 왜 push_str을 쓸 수 없는지 설명한다.", "문자열 리터럴과 String의 대표 차이는?", "리터럴은 &str이고 String은 소유하며 늘릴 수 있다."],

  ["소유권", "스택과 힙", "고정 크기 값은 보통 스택에 담기고 String의 글자 버퍼는 힙에 있다.", "String 변수에는 버퍼를 가리키는 정보가 있다. 버퍼를 언제 해제할지 결정하는 규칙이 소유권이다.", "let n = 7;\nlet text = String::from(\"hello\");", "n과 text의 실제 글자 버퍼가 어디에 있는지 그려 본다.", "String 글자 버퍼의 위치는?", "힙이다."],
  ["소유권", "소유자는 한 명", "각 값에는 현재 소유자가 있고 소유자가 범위를 벗어나면 값이 정리된다.", "같은 버퍼를 두 번 해제하지 않도록 Rust는 소유권 이전 후 원본 사용을 막는다.", "{\n    let name = String::from(\"Ada\");\n    println!(\"{name}\");\n} // name 정리", "중괄호 밖에서 name을 출력해 오류를 확인한다.", "범위를 벗어난 String은 어떻게 될까?", "소유자의 수명이 끝나 버퍼가 정리된다."],
  ["소유권", "이동과 Copy", "String을 다른 변수에 대입하면 기본적으로 소유권이 이동한다.", "작은 정수 같은 Copy 타입은 값이 복사된다. 이동 뒤 원본 String을 다시 쓰려면 명시적으로 clone해야 한다.", "let a = String::from(\"rust\");\nlet b = a;\nprintln!(\"{b}\"); // a는 사용 불가", "마지막 줄에 a도 출력해 오류를 읽고 clone을 적용한다.", "이동 후 a를 쓰지 못하는 이유는?", "소유권이 b로 넘어갔기 때문이다."],
  ["소유권", "함수 호출도 소유권 경계", "String을 값으로 받는 함수는 호출자의 소유권을 가져간다.", "함수 뒤에도 원본을 쓰려면 참조로 빌리거나 값을 돌려받아야 한다.", "fn consume(s: String) { println!(\"{s}\"); }\nlet text = String::from(\"hi\");\nconsume(text);", "consume(text) 뒤에 text를 쓰고 오류 이유를 말한다.", "값으로 받은 함수가 끝나면 text를 그대로 쓸 수 있을까?", "없다. text의 소유권을 함수에 넘겼다."],
  ["소유권", "불변 참조 &T", "참조를 건네면 소유권을 옮기지 않고 읽기만 할 수 있다.", "&String보다 &str이 문자열 읽기 함수에 더 유연하다. String과 문자열 리터럴을 모두 받을 수 있기 때문이다.", "fn length(s: &str) -> usize { s.len() }\nlet name = String::from(\"Kim\");\nprintln!(\"{}\", length(&name));", "함수 호출 뒤 name을 다시 출력하고 가능한 이유를 설명한다.", "length가 name을 소유할까?", "아니다. 읽기 전용으로 빌린다."],
  ["소유권", "가변 참조 &mut T", "원본을 수정하려면 소유자도 mut이고 빌림도 &mut여야 한다.", "같은 값에 대한 가변 빌림이 살아 있는 동안 다른 빌림을 겹치지 않게 해 데이터 경쟁을 막는다.", "fn shout(s: &mut String) { s.push('!'); }\nlet mut s = String::from(\"hi\");\nshout(&mut s);", "같은 범위에서 두 &mut를 동시에 사용하도록 바꿔 오류를 읽는다.", "동시에 두 개의 &mut가 허용되지 않는 이유는?", "서로 다른 경로에서 같은 값을 바꾸는 충돌을 막기 위해서다."],

  ["빌림과 자료", "빌림의 끝 읽기", "빌림은 참조를 마지막으로 사용하는 지점까지 필요하다.", "그 뒤에는 원본을 다시 수정할 수 있다. 범위가 끝날 때까지 무조건 기다리는 규칙으로 외우면 실제 코드를 오해한다.", "let mut s = String::from(\"a\");\nlet view = &s;\nprintln!(\"{view}\");\ns.push('b');", "println!보다 앞에 push를 옮겼을 때 무엇이 달라지는지 확인한다.", "위 코드에서 push가 가능한 이유는?", "view를 마지막으로 사용한 뒤이기 때문이다."],
  ["빌림과 자료", "댕글링 참조 금지", "참조는 자신이 가리키는 값보다 오래 살아서는 안 된다.", "지역 String을 가리키는 참조를 함수 밖으로 내보내면 함수 종료 시 값이 사라진다. 소유한 String을 반환한다.", "fn make_name() -> String {\n    String::from(\"Rust\")\n}", "String 대신 &str을 반환하려는 코드를 만들고 오류 설명을 읽는다.", "지역 String의 참조를 반환하면 왜 안 될까?", "원본이 먼저 사라져 참조가 무효해지기 때문이다."],
  ["빌림과 자료", "슬라이스와 UTF-8", "&str은 바이트 범위에 대한 문자열 뷰이며 인덱스는 문자가 아니라 바이트 기준이다.", "한글은 보통 여러 바이트다. 임의 바이트 경계에서 잘라 문자열을 만들면 실행 중 패닉이 날 수 있다.", "let s = \"가나다\";\nprintln!(\"{}\", s.chars().count());", "s.len()과 s.chars().count()를 비교한다.", "문자열의 len()이 글자 수와 다른 이유는?", "UTF-8 문자열의 바이트 수를 반환하기 때문이다."],
  ["빌림과 자료", "Vec<T> 늘어나는 목록", "Vec은 같은 타입의 값을 담고 필요하면 버퍼를 늘린다.", "추가 중 재할당이 일어날 수 있어 원소를 빌린 채 Vec을 수정하면 충돌한다. 인덱스 접근은 경계를 확인한다.", "let mut nums = vec![1, 2];\nnums.push(3);\nprintln!(\"{:?}\", nums.get(9));", "nums[9]와 nums.get(9)의 차이를 실행해 본다.", "get(9)가 더 안전한 이유는?", "범위 밖이면 패닉 대신 None을 돌려준다."],
  ["빌림과 자료", "HashMap과 소유권", "HashMap은 키를 값에 연결한다. String 키를 넣으면 맵으로 소유권이 옮겨질 수 있다.", "읽기는 get으로 Option을 받는다. 키 타입이 무엇인지 확인한 뒤 빌려 검색한다.", "use std::collections::HashMap;\nlet mut scores = HashMap::new();\nscores.insert(String::from(\"A\"), 10);\nprintln!(\"{:?}\", scores.get(\"A\"));", "없는 키를 조회했을 때 나오는 값을 설명한다.", "없는 키를 get으로 찾으면?", "None을 받는다."],
  ["빌림과 자료", "struct와 필드", "struct는 서로 관련된 값을 이름 있는 필드로 묶는다.", "소유한 String 필드를 쓰면 구조체가 데이터를 책임진다. &str 필드는 수명 관계를 따로 설명해야 하므로 처음엔 소유형이 쉽다.", "struct User { name: String, age: u8 }\nlet user = User { name: String::from(\"Min\"), age: 20 };", "age를 읽고 name을 바꾸는 데 필요한 mut를 적는다.", "User가 name 데이터를 소유하게 하려면 어떤 타입이 쉬울까?", "String이다."],

  ["모델링", "impl과 메서드", "impl은 타입에 동작을 붙인다. &self는 읽기, &mut self는 수정, self는 소비를 뜻한다.", "호출할 때 소유권이 이동하는지 메서드 서명에서 먼저 읽는다.", "struct Counter { n: u32 }\nimpl Counter { fn inc(&mut self) { self.n += 1; } }", "inc를 두 번 호출하고 결과를 출력한다.", "inc가 &mut self를 받는 이유는?", "Counter의 필드를 수정하기 때문이다."],
  ["모델링", "enum과 상태", "enum은 여러 가능성 중 정확히 하나를 표현한다.", "문자열로 상태를 흩뿌리면 잘못된 철자도 들어간다. enum은 가능한 상태를 타입에 적는다.", "enum Connection { Closed, Connecting, Open }\nlet state = Connection::Connecting;", "Connected 같은 새 상태를 추가하고 match가 무엇을 요구하는지 확인한다.", "enum이 문자열 상태보다 유리한 점은?", "가능한 상태를 제한하고 match 누락을 컴파일러가 찾아준다."],
  ["모델링", "Option<T>와 빈 값", "값이 없을 가능성을 Option<T>의 Some 또는 None으로 나타낸다.", "null처럼 없음을 감추지 않는다. unwrap은 None에서 패닉하므로 사용자 입력에는 match나 기본값을 쓴다.", "let found = Some(3);\nlet n = found.unwrap_or(0);", "None::<i32>로 바꿔 반환값을 예상한다.", "unwrap_or(0)은 None에서 무엇을 돌려줄까?", "0을 돌려준다."],
  ["모델링", "Result<T,E>와 실패", "실패할 수 있는 작업은 Result의 Ok 또는 Err를 돌려준다.", "Option은 값 유무, Result는 실패 이유까지 전달한다. 실패를 숨기지 말고 호출자에게 보여준다.", "let n: Result<i32, _> = \"42\".parse();\nprintln!(\"{:?}\", n);", "문자열을 42x로 바꿔 Err를 확인한다.", "parse 실패에는 Option보다 Result가 맞는 이유는?", "실패 이유를 담을 수 있기 때문이다."],
  ["모델링", "?로 오류 전달", "?는 Ok 값을 꺼내고 Err이면 현재 함수에서 곧바로 돌려준다.", "함수 반환형이 오류를 담을 수 있어야 한다. 모든 오류를 패닉으로 바꾸는 지름길이 아니다.", "fn number(s: &str) -> Result<i32, std::num::ParseIntError> {\n    let n = s.parse::<i32>()?;\n    Ok(n + 1)\n}", "number(\"7\")과 number(\"x\")의 결과를 예상한다.", "?가 Err를 만나면 어떻게 될까?", "현재 함수에서 그 Err를 반환한다."],
  ["모델링", "패턴과 if let", "한 가지 갈래만 필요하면 if let으로 간결하게 쓴다.", "모든 갈래를 명시해야 하는 정책 판단에는 match가 더 읽기 쉽다. 편의를 위해 오류 경로를 누락하지 않는다.", "let value = Some(5);\nif let Some(n) = value { println!(\"{n}\"); }", "None일 때 출력되는지 확인하고 else를 추가한다.", "if let이 적합한 경우는?", "한 패턴에 주로 관심이 있을 때다."],

  ["추상화", "모듈과 공개 범위", "mod는 코드를 이름 공간으로 나누고 pub은 외부에 공개할 항목을 고른다.", "기본은 비공개다. 내부 구현을 감추고 필요한 함수만 공개하면 변경 범위를 줄인다.", "mod math { pub fn double(n: i32) -> i32 { n * 2 } }\nprintln!(\"{}\", math::double(3));", "pub을 지우고 오류가 가리키는 범위를 읽는다.", "모듈 항목의 기본 공개 범위는?", "비공개다."],
  ["추상화", "crate와 패키지", "패키지는 Cargo.toml로 관리하고 crate는 컴파일 단위다.", "src/main.rs는 실행 crate, src/lib.rs는 라이브러리 crate의 시작점이다. 공용 로직은 lib.rs에 두면 테스트와 재사용이 쉽다.", "// src/lib.rs\npub fn twice(n: i32) -> i32 { n * 2 }", "main.rs에서 라이브러리 함수를 호출하는 구성을 그린다.", "lib.rs의 주 용도는?", "재사용할 라이브러리 코드를 담는 것이다."],
  ["추상화", "제네릭<T>", "제네릭은 타입마다 같은 구조를 재사용하게 한다.", "타입이 달라도 필요한 동작은 다를 수 있다. 비교하려면 PartialOrd 같은 제약을 명시한다.", "fn first<T>(items: &[T]) -> Option<&T> { items.first() }", "정수와 문자열 슬라이스에서 first를 호출한다.", "T에 아무 연산이나 할 수 있을까?", "아니다. 필요한 trait 제약이 있어야 한다."],
  ["추상화", "trait 계약", "trait는 타입이 제공해야 할 동작을 이름으로 정의한다.", "구체 타입보다 능력을 요구하는 함수가 재사용하기 쉽다. 구현에는 해당 메서드를 제공해야 한다.", "trait Label { fn label(&self) -> &str; }\nfn show(item: &impl Label) { println!(\"{}\", item.label()); }", "User에 Label을 구현한다면 어떤 문자열을 돌려줄지 적는다.", "trait의 핵심 역할은?", "타입이 제공할 동작의 계약을 정의한다."],
  ["추상화", "수명 표기는 관계", "수명 매개변수는 참조를 오래 살게 만드는 명령이 아니라 참조 사이 관계를 표시한다.", "둘 중 하나의 참조를 반환한다면 결과는 두 입력 중 더 짧게 유효한 범위를 넘을 수 없다.", "fn longer<'a>(a: &'a str, b: &'a str) -> &'a str {\n    if a.len() >= b.len() { a } else { b }\n}", "한 입력을 내부 블록에서 만든 뒤 밖에서 결과를 쓰려 해 본다.", "'a는 값을 더 오래 살게 만들까?", "아니다. 유효한 참조 관계를 표현할 뿐이다."],
  ["추상화", "클로저와 캡처", "클로저는 주변 값을 빌리거나 이동해 사용할 수 있는 짧은 함수다.", "move를 붙이면 캡처한 값의 소유권을 클로저로 가져간다. 스레드로 넘길 때 수명 문제를 해결하는 데 자주 쓴다.", "let offset = 3;\nlet add = |n| n + offset;\nprintln!(\"{}\", add(2));", "offset을 String으로 바꿔 move 클로저 뒤에 원본을 쓰려 해 본다.", "move 클로저가 String을 캡처하면 원본은?", "소유권이 클로저로 이동해 원본을 다시 쓸 수 없다."],

  ["실전 도구", "Iterator와 map", "Iterator는 원소를 한 번씩 제공하고 map은 각 원소를 변환한다.", "map만 호출하면 아직 결과가 소비되지 않는다. collect, for, sum 같은 소비 작업에서 실제 계산된다.", "let doubled: Vec<_> = [1, 2, 3].iter().map(|n| n * 2).collect();", "filter로 짝수만 남긴 뒤 collect해 결과를 예상한다.", "map만 선언하면 계산이 끝날까?", "아니다. 소비하는 연산이 필요하다."],
  ["실전 도구", "파일 읽기", "파일과 네트워크 I/O는 실패할 수 있으므로 Result를 다룬다.", "경로가 없거나 권한이 없으면 Err가 생긴다. 예시에서 ?로 호출자에게 실패를 전달한다.", "use std::fs;\nfn read(path: &str) -> std::io::Result<String> {\n    fs::read_to_string(path)\n}", "없는 경로로 호출하고 실패 내용을 출력한다.", "파일을 못 찾았을 때 성공 문자열을 반환할까?", "아니다. 오류를 담은 Err를 반환한다."],
  ["실전 도구", "테스트와 assert", "#[test] 함수는 cargo test로 실행한다.", "눈으로 출력만 보는 대신 기대값을 코드로 남긴다. 경계값과 실패 경로도 함께 검사한다.", "#[test]\nfn doubles_two() {\n    assert_eq!(2 * 2, 4);\n}", "기대값을 5로 바꿔 실패 메시지를 읽는다.", "테스트를 반복 실행하는 명령은?", "cargo test다."],
  ["실전 도구", "문서와 cargo doc", "/// 주석은 공개 API 설명과 예제를 남긴다.", "문서 예제도 테스트될 수 있어 설명과 실제 동작이 멀어지는 것을 막는다.", "/// 두 배를 돌려준다.\n/// ```\n/// assert_eq!(2 * 3, 6);\n/// ```\npub fn twice(n: i32) -> i32 { n * 2 }", "cargo doc --open과 cargo test의 역할을 비교한다.", "///의 용도는?", "API 문서를 작성하는 것이다."],
  ["실전 도구", "fmt와 clippy", "cargo fmt는 형식을 맞추고 clippy는 흔한 코드 문제를 알려준다.", "경고를 맹목적으로 지우기보다 근거를 읽고 고친다. CI에서는 같은 명령을 반복해 품질을 확인한다.", "cargo fmt --check\ncargo clippy --all-targets\ncargo test", "의도적으로 형식을 흐트러뜨린 뒤 fmt 결과를 비교한다.", "clippy는 무엇을 점검할까?", "코드의 흔한 오류와 개선점을 점검한다."],
  ["실전 도구", "의존성과 잠금", "외부 crate는 Cargo.toml의 dependencies에 추가한다.", "기능 플래그와 버전은 필요한 것만 고른다. 공급망과 빌드 재현성을 위해 Cargo.lock과 업데이트 내역을 검토한다.", "[dependencies]\nserde = { version = \"1\", features = [\"derive\"] }", "의존성을 추가한 뒤 cargo tree에서 어디에 쓰이는지 확인한다.", "Cargo.lock의 장점은?", "해결된 의존성 버전을 고정해 빌드를 재현하기 쉽다."],

  ["동시성과 네트워크", "스레드와 join", "스레드는 동시에 실행될 수 있고 join은 작업 종료를 기다린다.", "메인 함수가 먼저 끝나면 작업 결과를 보지 못할 수 있다. 스레드가 사용하는 값의 소유권도 명확히 옮긴다.", "let handle = std::thread::spawn(|| 2 + 3);\nprintln!(\"{:?}\", handle.join());", "join을 지우면 결과를 확실히 볼 수 있는지 설명한다.", "join의 역할은?", "스레드가 끝날 때까지 기다리고 결과를 받는다."],
  ["동시성과 네트워크", "채널로 값 보내기", "채널은 작업 간 값을 보내 소유권을 한쪽에서 다른 쪽으로 옮길 수 있다.", "보낸 쪽이 더 이상 그 String을 쓰지 못하는 이유를 소유권 규칙으로 설명할 수 있다.", "let (tx, rx) = std::sync::mpsc::channel();\ntx.send(String::from(\"hi\")).unwrap();\nprintln!(\"{:?}\", rx.recv());", "송신자를 drop한 뒤 recv 결과를 관찰한다.", "send한 String은 누가 소유할까?", "수신 측으로 소유권이 넘어간다."],
  ["동시성과 네트워크", "Arc<Mutex<T>>", "Arc는 스레드 사이 공동 소유를, Mutex는 한 번에 한 작업의 수정을 허용한다.", "잠금은 필요한 최소 범위에서 잡는다. 독점 접근은 규칙을 지키기 위한 수단이지 성능을 보장하지 않는다.", "use std::sync::{Arc, Mutex};\nlet count = Arc::new(Mutex::new(0));\n*count.lock().unwrap() += 1;", "스레드 둘이 count를 더할 때 Arc::clone이 필요한 이유를 적는다.", "Arc와 Mutex의 역할은 각각?", "Arc는 공동 소유, Mutex는 수정 동기화다."],
  ["동시성과 네트워크", "TCP는 바이트 흐름", "TCP의 read 한 번이 send 한 번과 같은 경계를 보장하지 않는다.", "길이 헤더나 구분자를 정해 메시지를 조립해야 한다. 읽은 바이트 수 0은 보통 상대의 송신 종료를 뜻한다.", "use std::io::Read;\nlet mut buf = [0_u8; 1024];\nlet n = stream.read(&mut buf)?;\n// 실제 데이터는 buf[..n]", "한 메시지가 두 번 나뉘어 읽히는 경우를 그림으로 설명한다.", "TCP read가 한 메시지를 보장할까?", "아니다. TCP는 메시지가 아니라 바이트 흐름이다."],
  ["동시성과 네트워크", "UDP는 데이터그램", "UDP의 recv_from은 한 데이터그램의 송신자 주소와 내용을 받는다.", "손실·중복·순서 뒤바뀜이 가능하다. 짧은 실습이라도 버퍼 길이와 타임아웃을 정하고 입력을 검증한다.", "use std::net::UdpSocket;\nlet socket = UdpSocket::bind(\"127.0.0.1:0\")?;\nsocket.set_read_timeout(Some(std::time::Duration::from_secs(2)))?;", "TCP의 경계 처리와 UDP의 손실 처리를 비교한다.", "UDP에서 받은 순서는 항상 송신 순서와 같을까?", "보장되지 않는다."],
  ["동시성과 네트워크", "입력 길이와 종료 처리", "외부에서 받은 길이를 곧바로 메모리 할당에 쓰지 않는다.", "최대 길이를 검사한 뒤 필요한 만큼만 읽는다. 타임아웃·연결 종료·잘못된 헤더를 별도 실패로 다룬다.", "const MAX: usize = 4096;\nif declared_len > MAX {\n    return Err(std::io::Error::new(std::io::ErrorKind::InvalidData, \"too large\"));\n}", "길이 0, 4096, 4097을 각각 어떻게 처리할지 정한다.", "길이 검사를 먼저 하는 이유는?", "과도한 할당과 범위 밖 처리를 막기 위해서다."],

  ["프로젝트 완성", "CLI 입력 읽기", "작은 명령줄 도구를 만들며 입력, 파싱, 출력의 경계를 나눈다.", "입력이 없거나 잘못됐을 때 사용법을 보여주고 종료 코드를 남긴다. 정상 경로만 구현하면 실제 도구가 되지 않는다.", "let input = std::env::args().nth(1).ok_or(\"숫자를 입력하세요\")?;\nlet number: i32 = input.parse()?;", "인자 없음, 문자 입력, 정상 숫자를 각각 시험한다.", "args().nth(1)이 None인 경우는?", "첫 번째 사용자 인자가 없는 경우다."],
  ["프로젝트 완성", "데이터 구조 선택", "과제의 연산부터 적고 Vec·HashMap·struct 중 알맞은 것을 고른다.", "순서가 중요하면 Vec, 키 조회가 중요하면 HashMap, 한 항목의 필드는 struct가 적합하다. 익숙한 타입부터 고르지 않는다.", "struct Task { title: String, done: bool }\nlet tasks: Vec<Task> = Vec::new();", "할 일 추가·완료·제목 검색에 필요한 연산을 표로 적는다.", "순서대로 할 일을 표시하려면 어떤 기본 컨테이너가 쉬울까?", "Vec이다."],
  ["프로젝트 완성", "오류를 사용자에게 전달", "내부 오류와 사용자에게 보여줄 메시지를 분리한다.", "파싱 실패나 파일 실패를 Result로 올리고 가장 바깥에서 출력한다. unwrap으로 전체 프로그램을 터뜨리지 않는다.", "fn run() -> Result<(), Box<dyn std::error::Error>> {\n    let n: u32 = \"12\".parse()?;\n    println!(\"{n}\");\n    Ok(())\n}", "잘못된 입력을 주었을 때 어떤 메시지가 도움이 될지 적는다.", "unwrap 대신 Result를 유지하는 이유는?", "실패를 호출자에게 전달해 적절히 처리할 수 있기 때문이다."],
  ["프로젝트 완성", "경계 테스트 만들기", "정상 사례 하나보다 빈 입력·최대 길이·잘못된 형식을 더 검증한다.", "순수 함수로 파싱을 분리하면 네트워크나 파일 없이 빠르게 검사할 수 있다.", "fn parse_count(s: &str) -> Result<usize, std::num::ParseIntError> { s.parse() }\n#[test] fn bad_count() { assert!(parse_count(\"x\").is_err()); }", "빈 문자열과 매우 큰 숫자를 넣어 기대 결과를 적는다.", "파싱을 순수 함수로 분리하는 이점은?", "외부 자원 없이 경계 사례를 쉽게 테스트할 수 있다."],
  ["프로젝트 완성", "작은 TCP 에코 서버", "클라이언트가 보낸 바이트를 그대로 돌려주는 서버로 I/O 흐름을 확인한다.", "read의 반환값 n만큼만 write_all 한다. 실제 서버에는 읽기 제한, 타임아웃, 동시 접속 제한도 필요하다.", "let n = stream.read(&mut buf)?;\nif n > 0 { stream.write_all(&buf[..n])?; }", "빈 입력, 여러 번 나뉜 입력, 연결 종료를 순서대로 시험한다.", "buf 전체 대신 buf[..n]을 보내는 이유는?", "실제로 읽은 바이트만 유효하기 때문이다."],
  ["프로젝트 완성", "끝까지 설명하고 다시 만들기", "완료 기준은 문법 암기가 아니라 소유권·오류·경계 처리를 설명하며 작은 도구를 다시 만드는 것이다.", "답을 가리고 새 프로젝트에서 입력→처리→출력→테스트를 구현한다. 막히는 단계만 다시 열어보고 다음 날 재시도한다.", "cargo new final_project\ncd final_project\ncargo test\ncargo clippy --all-targets", "도움 없이 소유권 이동 한 번, Result 오류 한 번, 경계 테스트 두 개를 포함한 도구를 만든다.", "다시 만들 때 반드시 확인할 세 가지는?", "소유권, 오류 처리, 입력 경계다."],
];

export const RUST_CURRICULUM: RustLesson[] = rows.map((row, index) => ({
  id: index + 1,
  section: row[0],
  title: row[1],
  idea: row[2],
  detail: row[3],
  code: row[4],
  tryIt: row[5],
  check: row[6],
  answer: row[7],
}));
