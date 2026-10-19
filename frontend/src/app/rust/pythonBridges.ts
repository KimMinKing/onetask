// Optional comparisons for readers who have seen Python. They explain a
// familiar shape without claiming the two languages have identical rules.
export interface PythonBridge {
  id: number;
  python: string;
  rust: string;
  explanation: string;
}

export const PYTHON_BRIDGES: PythonBridge[] = [
  {id: 4, python: "def double(x):\n    return x * 2", rust: "fn double(x: i32) -> i32 {\n    x * 2\n}", explanation: "두 함수 모두 받은 수를 두 배로 돌려준다. Rust의 마지막 `x * 2`에는 반환 값이 되도록 세미콜론을 붙이지 않았다. Rust에서도 `return x * 2;`라고 명시할 수 있다."},
  {id: 5, python: "score = 3\nscore = score + 1", rust: "let mut score = 3;\nscore = score + 1;\n// 또는 새 바인딩: let score = score + 1;", explanation: "Python의 재대입과 비슷하게 원래 Rust 바인딩을 바꾸려면 `mut`가 필요하다. 두 번째 `let`은 원래 값을 고친 것이 아니라 같은 이름의 새 바인딩을 만든다."},
  {id: 15, python: "a = ['hello']\nb = a\nprint(a)  # 여전히 사용 가능", rust: "let a = String::from(\"hello\");\nlet b = a;\nprintln!(\"{b}\");\n// println!(\"{a}\");  // 이동 후 사용 불가", explanation: "Python의 두 이름은 같은 리스트를 가리킬 수 있다. Rust의 `String` 대입은 소유권을 옮기므로 예전 이름 a를 쓸 수 없다. 같은 물건을 공유하는 Python 사례와 Rust의 move를 동일한 동작으로 생각하면 안 된다."},
  {id: 17, python: "def length(s):\n    return len(s)\nname = 'Kim'\nprint(length(name))", rust: "fn length(s: &str) -> usize { s.len() }\nlet name = String::from(\"Kim\");\nprintln!(\"{}\", length(&name));", explanation: "두 예 모두 이름의 길이를 읽고 원본을 계속 쓴다. 다만 Rust의 `&str`은 빌린 참조이며 원본의 유효 기간과 수정 여부를 컴파일러가 검사한다. Python의 참조와 안전 규칙이 같지는 않다."},
  {id: 22, python: "numbers = [2, 4]\nnumbers.append(6)\nprint(numbers[0])", rust: "let mut numbers = vec![2, 4];\nnumbers.push(6);\nprintln!(\"{}\", numbers[0]);", explanation: "목록 끝에 값을 넣고 첫 값을 읽는 모습은 비슷하다. Rust의 `Vec<i32>`에는 같은 타입의 값이 들어가고, 인덱스가 없으면 `get`으로 안전하게 확인할 수 있다."},
  {id: 27, python: "first = items[0] if items else None", rust: "let first: Option<&i32> = items.first();\nmatch first {\n    Some(n) => println!(\"{n}\"),\n    None => println!(\"비어 있음\"),\n}", explanation: "Python의 `None`과 Rust의 `None`은 ‘값이 없음’을 표현한다. Rust에서는 반환 타입 `Option<&i32>`에 그 가능성이 드러나고, `Some`과 `None`을 나누어 처리할 수 있다."},
  {id: 28, python: "try:\n    text = open(path).read()\nexcept OSError as error:\n    print(error)", rust: "match std::fs::read_to_string(path) {\n    Ok(text) => println!(\"{text}\"),\n    Err(error) => eprintln!(\"{error}\"),\n}", explanation: "둘 다 파일 읽기 실패를 처리한다. Python은 예외를 잡고, 이 Rust 함수는 `Result` 값을 돌려주므로 `Ok`와 `Err`를 나눠 본다. 모든 Rust 함수가 똑같은 오류 타입을 쓰는 것은 아니다."},
  {id: 37, python: "doubled = list(map(lambda n: n * 2, [1, 2, 3]))", rust: "let doubled: Vec<_> = [1, 2, 3]\n    .iter()\n    .map(|n| n * 2)\n    .collect();", explanation: "각 숫자를 두 배로 바꾸는 흐름이다. Rust의 `map`은 지연되므로 `collect`가 값을 모으면서 계산한다. Python도 `map`만 만든 경우에는 `list` 같은 소비가 필요하다."},
  {id: 46, python: "chunk = sock.recv(1024)\n# chunk가 요청 전체라는 보장은 없음", rust: "let mut buf = [0_u8; 1024];\nlet n = stream.read(&mut buf)?;\n// 이번에 받은 바이트는 &buf[..n]", explanation: "두 언어 모두 TCP 소켓에서 이번 호출이 받은 바이트만 준다. 요청 한 개를 완성하려면 길이 헤더나 구분자 같은 규칙에 따라 더 읽어야 한다. `recv(1024)`나 `read` 한 번을 메시지 한 개로 믿지 않는다."},
];
