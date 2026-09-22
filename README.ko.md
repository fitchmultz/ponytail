<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.png">
    <img src="assets/logo.png" width="220" alt="Ponytail, the lazy senior dev">
  </picture>
</p>

<h1 align="center">Ponytail</h1>

<p align="center">
  <em>말이 없다. 한 줄을 쓴다. 돌아간다.</em>
</p>

이 포크는 하나의 정책을 어댑터들이 공유하고 Pi의 기본 세션 제어 기능을 사용한다. 요청한 결과 전체를 가장 단순한 올바른 구현으로 완성한다. 보안, 속도, 비용 절감을 보장하지 않는다.

<p align="center">
  <sub>커뮤니티 번역이다. 기준이 되는 최신 버전은 <a href="README.md">영어 README</a>다.</sub>
</p>

---

<p align="center">
  <a href="https://ponytail.dev/soon"><img src="assets/waitlist-banner-ko.png" alt="새로운 것이 다가오고 있습니다, 대기자 명단 신청" width="760"></a>
</p>

이런 사람, 다들 알 거다. 긴 포니테일에 타원형 안경. 버전 관리 시스템보다 회사에 오래 있었다. 코드 쉰 줄을 들이밀면 잠깐 보더니, 말없이 한 줄로 바꿔 놓는다.

Ponytail은 그를 당신의 AI 에이전트 안에 앉혀 둔다.

## Before / after

날짜 선택기 하나 만들어 달라고 한다. 에이전트는 flatpickr를 깔고, 래퍼 컴포넌트를 짜고, 스타일시트를 붙이더니, 타임존 얘기를 꺼내기 시작한다.

ponytail이라면:

```html
<!-- ponytail: browser has one -->
<input type="date">
```

살아남은 것들이 더 궁금하다면 [examples/](examples/)로.

## Evidence

[과거 Haiku 4.5 벤치마크](benchmarks/results/2026-06-18-agentic.md)는 당시 작업, 모델, 정책의 결과다. Astra 성능이나 이번 릴리스의 안전성을 입증하지 않는다. 줄 수가 적다는 것만으로 정확성을 판단할 수 없다.

[Pi 기본 평가 도구](benchmarks/pi/README.md)는 동일한 작업을 Ponytail 사용 여부에 따라 반복 비교하며 별도 검증 작업도 포함한다. 효율 비교에 앞서 정확성과 요청 범위의 완전성을 확인한다. 비용은 추정치이며, 실패 시 보고되지 않은 사용량은 알 수 없는 값이다.

## How it works

코드를 쓰기 전에, 에이전트는 가장 먼저 들어맞는 단계에서 멈춘다:

```
1. 요청 범위 밖의 기능인가?   → 추측으로 추가하지 않는다
2. 이미 이 코드베이스에 있나?  → 다시 짜지 말고 가져다 쓴다
3. 표준 라이브러리로 되나?     → 쓴다
4. 네이티브 플랫폼 기능인가?   → 쓴다
5. 깔려 있는 의존성이 푸나?    → 쓴다
6. 단순하게 구현 가능한가?   → 필요한 동작을 모두 보존한다
7. 그제서야: 돌아가는 최소한
```

단계를 밟는 건 문제를 이해한 *다음*이지, 이해를 대신하는 게 아니다. 변경이 닿는 코드를 읽고 실제 흐름을 따라가 본 뒤에야 단계를 고른다. 해법에는 게을러도, 읽는 데는 절대 게으르지 않다.

게으른 거지 부주의한 게 아니다. 신뢰 경계의 검증, 데이터 손실 방지, 보안, 접근성은 결코 잘려 나가지 않는다.

## Install

이 포크는 GitHub와 Pi Git 설치 경로로 배포한다. npm 및 ClawHub의 upstream 패키지는 별도 릴리스다.

Claude Code와 Codex 플러그인은 자그마한 Node.js 라이프사이클 훅 두 개를 돌리니, `node`가 PATH에 잡혀 있어야 한다(Nix/nvm 사용자라면 비대화형 셸의 PATH에 있어야 한다). 없어도 스킬은 멀쩡히 돌아간다. 다만 늘 켜져 있던 자동 활성화가 매 프롬프트마다 에러를 뱉는 대신 조용히 비활성으로 남을 뿐이다.

### Claude Code

```
/plugin marketplace add fitchmultz/ponytail
```
```
/plugin install ponytail@ponytail
```
(설치가 되려면 두 프롬프트를 따로 보내야 한다)

데스크톱 앱에는 `/plugin` 명령이 없다. 대신 UI에서 설치한다: Customize, 개인 플러그인 옆의 +, Create plugin and add marketplace, Add from repository, 그다음 저장소 URL 입력(감사합니다 @NiklasDHahn, #98).

### Codex

```bash
codex plugin marketplace add fitchmultz/ponytail
codex
```

`/plugins`를 열어 Ponytail 마켓플레이스를 고르고 Ponytail을 설치한다. 그런 다음
`/hooks`를 열어 라이프사이클 훅 두 개를 검토하고 신뢰한 뒤, 새 스레드를 시작한다.

이 설치 한 번이면 Codex 데스크톱 앱도 같이 잡힌다. 설치 후 앱을 다시 켜면 플러그인을 알아챈다.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add fitchmultz/ponytail
copilot plugin install ponytail@ponytail
```

대화형 Copilot CLI 세션에서는 슬래시 명령으로 똑같이 하면 된다:

```
/plugin marketplace add fitchmultz/ponytail
/plugin install ponytail@ponytail
```

Copilot CLI는 플러그인 명령에 그 이름을 네임스페이스로 붙인다. 예를 들면:

```text
/ponytail:ponytail ultra
/ponytail:ponytail-review
```

### Pi agent harness

Pi 0.87.0 이상이 필요하다.

```bash
pi install git:github.com/fitchmultz/ponytail@v5.0.0
```

Ponytail 패키지는 하나만 설정하고, 기존 스킬 필터를 새 항목에 유지한다. 설치 후 Pi를 다시 로드한다.

`/ponytail`은 기본 모드를 활성화하고 `/ponytail status`는 상태를 표시한다. 모드 변경은 작업 도중에도 다음 모델 호출부터 적용된다. 모드는 세션 분기별로 유지되며 `/ponytail default <모드>`는 새 세션에 적용된다. 잘못된 설정 파일은 덮어쓰지 않고 오류를 알린다.

스킬 별칭은 인수를 보존하고 비활성화된 스킬 설정을 존중한다. 작업 중에는 후속 요청으로 대기한다. `off`는 Ponytail 섹션만 제거하며 독립적인 `AGENTS.md` 규칙이나 이전 메시지를 지우지 않는다. 다른 확장의 전체 시스템 프롬프트 교체가 우선할 수 있다. `/skill:ponytail`은 독립 스킬을 불러오며 영구 모드를 바꾸지 않는다. 자세한 내용은 [영어 README](README.md#pi-agent-harness)를 참고한다.

### OpenCode

이 포크의 체크아웃을 `opencode.json`에 등록한다(`hooks/`와 `skills/`를 그대로 쓴다):

```json
{ "plugin": ["./.opencode/plugins/ponytail.mjs"] }
```

매 턴마다 지금 레벨의 룰셋을 주입하고, `/ponytail` 명령들을 붙여 준다([Commands](#commands) 참고). OpenCode는 이 저장소의 `AGENTS.md`도 알아서 불러오니, 플러그인이 없어도 규칙은 살아 있다. 플러그인은 `lite/full/ultra/off` 레벨을 얹어 준다.

`./` 경로는 프로젝트의 `opencode.json`을 기준으로 풀린다. 체크아웃 하나를 여러 프로젝트에서 같이 쓰려면, 대신 `.mjs`의 절대 경로를 가리키면 된다(그 파일은 제 위치를 기준으로 `hooks/`와 `skills/`를 찾는다).

### Gemini CLI

```bash
gemini extensions install https://github.com/fitchmultz/ponytail
```

매 세션 룰셋을 늘 켜진 컨텍스트로 불러오고 `/ponytail` 명령들을 등록한다. `skills/`도 함께 실리며, 작업에 필요할 때 켜진다.
Gemini 어댑터는 일부러 루트 `hooks/hooks.json`을 두지 않는다. Gemini는 그 경로를 자동으로 불러오는데, ponytail의 라이프사이클 훅은 Claude/Codex 이벤트 이름을 쓰기 때문이다.

### Antigravity CLI

Google이 Gemini CLI를 Antigravity CLI(`agy` 바이너리)로 이름을 바꾸는 중인데, 같은 확장이 거기에도 설치된다:

```bash
agy plugin install https://github.com/fitchmultz/ponytail
```

이 저장소의 `gemini-extension.json`을 그대로 재사용한다. 차이는 하나다. Antigravity는 `/ponytail` 명령들을 스킬로 바꿔 버려서, 슬래시 메뉴에서 고르는 대신 채팅에 직접 친다(예: `/ponytail-review`를 메시지로). 전환이 마무리될 때까지(2026년 6월 18일경)는 `gemini extensions install`도 여전히 먹힌다. 늘 켜진 규칙으로 돌리고 싶으면, 룰셋을 `.agents/rules/`에 넣으면 된다.

### CodeWhale

프로젝트 루트의 `AGENTS.md`를 읽고, 설정은 전혀 필요 없다. [`AGENTS.md`](AGENTS.md)를 프로젝트에 복사하거나, 이 저장소를 체크아웃한 곳에서 `codewhale`을 돌리면 된다. 그게 끝이다.

### Swival

먼저 컬렉션을 라이브러리에 스테이징한 다음, 원하는 스킬을 더한다:

```bash
swival skills add --global https://github.com/fitchmultz/ponytail  # ~/.config/swival/library에 스테이징
swival skills add ponytail                                             # 이 프로젝트에 컬렉션 설치
swival skills add --global ponytail                                    # 또는 모든 프로젝트에서 켜기
```

Swival도 프로젝트 루트의 `AGENTS.md`와 전역의 `~/.config/swival/AGENTS.md`를 읽는다. 지시문 전용 폴백이다.

명령줄에서는 `$` 접두사로 스킬을 명시적으로 켠다. 예: `$ponytail-review`.

### Devin CLI

```bash
devin plugins install fitchmultz/ponytail
```

ponytail을 Devin 플러그인으로 설치한다. 스킬은 `/ponytail:ponytail`, `/ponytail:ponytail-review` 등으로 쓸 수 있다.

### OpenClaw

[`.openclaw/skills/`](.openclaw/skills/)에서 필요한 스킬 디렉터리를 `~/.openclaw/skills/`로 복사한다. 각 스킬은 독립적이다. ClawHub 컬렉션은 upstream이 배포하며 이 포크의 릴리스가 아니다.

### Grok Build

```bash
grok plugin install fitchmultz/ponytail --trust
```

플러그인은 기본이 꺼져 있다. `/plugins` → Plugins에서 `ponytail`에 Space, 또는 `~/.grok/config.toml`:

```toml
[plugins]
enabled = ["ponytail"]
```

새 세션을 열거나 플러그인을 다시 로드한다. 스킬은 `/ponytail`, `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt`, `/ponytail-gain`, `/ponytail-help`로 보인다. `grok inspect`로 확인. Grok은 스킬 설명을 바탕으로 코딩 작업에서 ponytail을 자동으로 호출할 수 있다. 명시적으로 활성화해야 하면 `/ponytail`(또는 `/ponytail lite`, `/ponytail full`, `/ponytail ultra`)을 사용한다. `SessionStart` 출력으로는 지시문을 주입할 수 없으므로 Grok 라이프사이클 훅은 사용하지 않는다.

체크아웃의 `AGENTS.md`만으로도 지시문 전용 모드는 된다. 제거: `grok plugin uninstall ponytail`.

### Cursor

```bash
git clone https://github.com/fitchmultz/ponytail
node ponytail/scripts/cursor-hooks.js install
```

네이티브 훅 두 개를 `~/.cursor/hooks.json`에 합쳐 넣고(`--project`를 붙이면 `<프로젝트>/.cursor/hooks.json`에 쓴다), 이미 있던 다른 훅은 그대로 둔다. 항목들은 그 체크아웃에서 `node`를 실행하니, 체크아웃을 옮기지 말거나 옮긴 뒤 설치를 다시 돌린다. Cursor는 저장하면 파일을 다시 읽는다. 새 채팅을 열면 기본 레벨의 룰셋이 `sessionStart`로 들어온다. `/ponytail lite`, `/ponytail full`, `/ponytail ultra`, `/ponytail off`를 일반 메시지로 보내면 그 대화의 남은 구간 동안 레벨이 바뀌고, `/ponytail`은 현재 레벨을 알려 준다. Cursor의 `subagentStart`는 컨텍스트를 주입할 수 없어서 서브에이전트는 룰셋 없이 돌고, 클라우드 에이전트는 `sessionStart`를 아예 실행하지 않는다. 늘 켜진 규칙(`.cursor/rules/ponytail.mdc`)과 훅은 둘 중 하나만 쓴다. 규칙이 워크스페이스에 있으면 훅은 아무것도 주입하지 않고 모드 명령은 안내문으로 답하니, 훅이 레벨을 관리하게 하려면 규칙을 지운다. 계약, 검증 기록, 한계: [docs/cursor-hooks.md](docs/cursor-hooks.md). 제거: `node ponytail/scripts/cursor-hooks.js uninstall`.

이게 끝이었다. 그 사람이라면 흐뭇해할 거다. 입 밖으로 내진 않겠지만.

매 세션 켜져 있고, 명령 몇 개가 딸려 온다([Commands](#commands) 참고). `/ponytail ultra`는 코드베이스가 당신에게 단단히 밉보인 날을 위해 있다. 시작할 때와 모드를 바꿀 때 지금 모드를 보여 준다.

새 세션마다 적용할 레벨은 `PONYTAIL_DEFAULT_MODE` 환경 변수(`lite`/`full`/`ultra`/`off`)로, 또는 `~/.config/ponytail/config.json`의 `defaultMode` 필드(Windows에선 `%APPDATA%\ponytail\config.json`)로 정한다. 기본값은 `full`이다.

Cursor(규칙 파일만, [훅 설치](#cursor)의 대안), Windsurf, Cline, GitHub Copilot(에디터), Aider, Kiro, Zed, CodeWhale: 이 저장소에서 맞는 규칙 파일을 복사하면 된다([`.cursor/rules/`](.cursor/rules/), [`.windsurf/rules/`](.windsurf/rules/), [`.clinerules/`](.clinerules/), [`.github/copilot-instructions.md`](.github/copilot-instructions.md), [`AGENTS.md`](AGENTS.md), [`.kiro/steering/`](.kiro/steering/)).

Kiro: `.kiro/steering/ponytail.md`를 `~/.kiro/steering/`(전역)이나 프로젝트의 `.kiro/steering/`에 복사한다.

GitHub Copilot CLI 폴백(지시문 전용 모드): 프로젝트의 `AGENTS.md`와 `.github/copilot-instructions.md`를 읽거나, 모든 프로젝트에서 ponytail을 돌리려면 규칙을 `~/.copilot/copilot-instructions.md`에 복사한다. 이 경로는 늘 켜진 가이드는 살리지만, 플러그인 모드 전환이나 훅은 더해 주지 않는다.

Codex 확장을 쓰는 VS Code는 이 저장소가 함께 싣는 `AGENTS.md`를 읽으니, 저장소 루트에서 설정 없이 돌아간다(`~/.codex/AGENTS.md`를 두면 Codex 전역으로 잡힌다).

어떤 파일이 어느 에이전트에 매핑되는지: [Agent portability](docs/agent-portability.md).

## Commands

| 명령 | 하는 일 |
|---------|--------------|
| `/ponytail [lite \| full \| ultra \| off]` | 강도를 정하거나, 끈다. 인수 없는 동작은 호스트에 따라 다르며 Pi에서는 기본 모드를 활성화한다. |
| `/ponytail-review` | 지금 diff를 과잉 구현 관점에서 훑고, 삭제 목록을 돌려준다. |
| `/ponytail-audit` | diff만이 아니라 저장소 전체를 과잉 구현 관점에서 감사한다. |
| `/ponytail-debt` | 미뤄 둔 `ponytail:` 간소화들을 장부로 모아, "나중에"가 "영영"이 되지 않게 한다. |
| `/ponytail-gain` | 과거 벤치마크 결과와 한계를 설명한다. 현재 세션의 절감 수치를 주장하지 않는다. |
| `/ponytail-help` | 위 명령들의 빠른 참조. |

명령들은 스킬을 지원하는 호스트가 있어야 돈다(Claude Code, Codex, Devin CLI, OpenCode, Gemini, pi, Swival). Codex에선 스킬이라 `@`로 부른다(`@ponytail-review`). [훅](#cursor)을 쓰는 Cursor는 `/ponytail` 레벨 전환만 되고, 일반 메시지로 입력한다. 지시문 전용 어댑터(Cursor 규칙 파일, Windsurf, Cline, Copilot, Kiro, Antigravity)는 명령 없이 늘 켜진 룰셋만 불러온다.

## Development

`hooks/ponytail-core.md`와 `hooks/ponytail-modes.json`을 편집한 뒤 사본을 생성하고 확인한다. 워크플로 본문은 `skills/`에서 편집한다:

```bash
npm ci --ignore-scripts
npm install --prefix ponytail-mcp --ignore-scripts
node scripts/build-openclaw-skills.js
node scripts/check-rule-copies.js
node scripts/check-versions.js
npm test
```

생성기는 핵심 스킬, 정적 규칙, 명령, OpenClaw 사본을 만든다. 오래된 사본은 검증에서 실패한다. 실제 Astra 작업은 [Pi 기본 평가 도구](benchmarks/pi/README.md)로 확인한다.

정확성 벤치마크는 이메일·CSV 검사를 위해 Python을 띄운다. `python`보다 `python3`를 먼저 시도한다. CSV 검사는 로컬에 `pandas`가 깔려 있어야 한다.

## FAQ

**설정 파일이 필요한가?**
아니다. 선택 사항인 `~/.config/ponytail/config.json`이나 `PONYTAIL_DEFAULT_MODE` 환경 변수로 기본 레벨을 정할 순 있지만, 꼭 있어야 하는 건 없다.

**그래도 120줄짜리 캐시 클래스가 정말 필요하다면?**
요청한 동작에 필요하면 구현한다. 단순함을 이유로 명시적인 요구사항을 취소하지 않는다.

**확장은 되나?**
실제 부하를 검증한다. 필요한 동작을 보존할 때만 코드 감소가 의미 있다.

**왜 하필 "ponytail"인가?**
당신은 이유를 정확히 안다.

## Sponsors

<p align="center">
  <a href="https://greenpt.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/logo-greenpt-dark.svg">
      <img src="assets/logo-greenpt.svg" width="260" alt="GreenPT">
    </picture>
  </a>
</p>

## License

[MIT](LICENSE). 돌아가는 가장 짧은 라이선스.

## Star History

<a href="https://www.star-history.com/fitchmultz/ponytail#history">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=fitchmultz/ponytail&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=fitchmultz/ponytail&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=fitchmultz/ponytail&type=Date" />
 </picture>
</a>
