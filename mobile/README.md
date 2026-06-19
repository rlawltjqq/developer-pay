# 📱 DevPay Mobile (Expo / React Native)

DevPay 웹과 **동일한 `/api/v1` REST API**를 소비하는 모바일 앱 골격.
데이터·비즈니스 로직은 서버(Vercel)에 있고, 앱은 화면만 담당합니다.

## 실행

```bash
cd mobile
npm install
npx expo start          # QR 코드 → Expo Go 앱으로 스캔 (iOS/Android)
# 또는
npx expo start --ios     # iOS 시뮬레이터
npx expo start --android # Android 에뮬레이터
npx expo start --web     # 웹 미리보기
```

> 별도 백엔드 실행이 필요 없습니다. 앱이 배포된 API(`https://developer-pay.vercel.app/api/v1`)를 직접 호출합니다.
> 로컬 서버로 붙이려면 `src/api.js`의 `BASE_URL`만 `http://<내IP>:3000/api/v1`로 바꾸세요.

## 화면

| 탭 | 사용 API | 설명 |
|---|---|---|
| 🏆 직군 | `GET /jobs` | 직군별 연봉 랭킹, 탭하면 기술·장비 펼침 |
| 💻 기술 | `GET /tech` | 기술스택·언어별 연봉 |
| ⌨️ 장비 | `GET /gear`, `POST /gear/:id/vote` | 키보드·마우스 랭킹 + 투표(쓰기) |
| 💰 실수령 | `GET /take-home` | 연봉 실수령액 계산기 |

## 구조

```
App.js                 # 하단 탭 + 화면 전환 (내비게이션 라이브러리 없는 경량 골격)
src/api.js             # API 클라이언트 (BASE_URL, apiGet/apiPost)
src/theme.js           # 웹과 동일한 색상 팔레트
src/components/Screen.js # 로딩/에러 공통 래퍼
src/screens/*.js       # 탭별 화면
```

## 다음 단계 제안

- `@react-navigation/bottom-tabs`로 내비게이션 고도화 (딥링크·스택 화면)
- 나머지 웹 기능 이식: 내 연봉 위치(+공유), 연봉 분포, 스택 ROI, 국가 비교, 연봉 제출
- 푸시 알림(expo-notifications)으로 "관심 직군 연봉 변동 알림"
- EAS Build로 스토어 배포 (`eas build`)
