# Yesterday's Weather

어제의 기온과 오늘의 기온을 나란히 보여주는 극단적 미니멀 날씨 웹.

> "날씨를 기능적 데이터가 아닌 하루의 분위기와 기억을 구성하는 요소로 다룸"

핵심 질문 하나: **"어제보다 오늘이 더 춥나?"**

## 기능

- 어제 vs 오늘 온도 나란히 비교 (동일 크기)
- 온도 차이 표시 ("어제보다 3°C 높음 ↑")
- 날씨 타입별 배경 그라데이션 (clear, cloudy, fog, rain, snow, storm)
- 80개+ 인기 도시 + Nominatim 검색
- 온도 단위 토글 (°C/°F, 국가 기반 자동 선택)
- Pull to refresh
- PWA + 자동 업데이트 (network-first HTML)
- 동적 OG 이미지 (`/og` 엔드포인트)

## 스택

- **서버**: Hono + Bun + Fly.io (nrt)
- **클라이언트**: HTML/CSS + Alpine.js
- **날씨 API**: Open-Meteo Forecast API (무료, 키 불필요)

## 실행

```bash
bun install
bun run dev    # http://localhost:3000
fly deploy
```

## API

| 엔드포인트 | 설명 |
|-----------|------|
| `/api/weather?lat=&lon=` | 오늘 + 어제 날씨 (Forecast API) |
| `/api/yesterday?lat=&lon=` | 어제 날씨 (legacy) |
| `/og?lat=&lon=` | 동적 OG 이미지 (SVG) |

## 날씨 타입

| 타입 | WMO 코드 | 배경 |
|------|----------|------|
| clear | 0 | 골든 (밝은) |
| cloudy | 1-3 | 블루그레이 (밝은) |
| fog | 4-49 | 라벤더 (밝은) |
| rain | 50-69 | 딥틸 (어두운) |
| snow | 70-79 | 아이시블루 (밝은) |
| storm | 80-99 | 퍼플 (어두운) |

## TODO

→ [GitHub Issues](https://github.com/80x24/yesterdays-weather/issues) + [80x24 Roadmap](https://github.com/users/80x24/projects/3)

## 마케팅

**타겟:** 매일 아침 "어제보다 추운가?" 궁금한 사람, 미니멀 도구 애호가
**채널:** Product Hunt, Twitter #buildinpublic, Reddit r/InternetIsBeautiful, HN Show HN
**핵심 카피:** "The weather app that only shows yesterday vs today"

---

*사업은 아니지만, 남길 가치는 있는 프로젝트.*
