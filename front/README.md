# Mirrorgram (Mirrorgram)
![메인로고](https://github.com/user-attachments/assets/c547b261-c5d5-4836-8004-d15cb383a8a4)

## 프로젝트 소개

Mirrorgram 은 사용자의 감정을 기록하고 공유할 수 있는 혁신적인 소셜 네트워킹 앱입니다. 최신 AI 기술을 활용하여 사용자의 감정을 분석하고, 개인화된 페르소나와 상호작용할 수 있는 독특한 기능을 제공합니다. 이 앱은 외로움을 느끼는 사람들을 위해 특별히 설계되었으며, 사용자가 자신의 감정을 표현하고 다른 사람들과 연결될 수 있는 안전한 공간을 제공합니다.

## 주요 기능
![image](https://github.com/user-attachments/assets/811e4ae4-ecfb-4145-9c2a-489d96d53c90)
![자동 피드생성](https://github.com/user-attachments/assets/68acab71-da71-4118-8457-49e6033a8a55)
![ai빌리지](https://github.com/user-attachments/assets/9e09be9f-5491-4f1a-8dfc-16cb877ae867)
![이미지 생성](https://github.com/user-attachments/assets/4ad9a0b4-a250-4eee-8604-512ae03f9fb0)
![친구](https://github.com/user-attachments/assets/2272e64a-c596-4c04-a969-224203f53d20)
![알림](https://github.com/user-attachments/assets/35d6b08d-c89d-47db-b9bc-b45dc86f01bc)



1. **AI 기반 페르소나 생성**
   - 사용자의 사진을 기반으로 개인화된 페르소나 생성
   - 다양한 감정 상태를 표현하는 캐릭터 이미지 제공

2. **감정 일기 작성**
   - 텍스트, 이미지, 동영상을 포함한 멀티미디어 일기 작성
   - AI 감정 분석을 통한 자동 태그 생성

3. **페르소나와의 대화**
   - 생성된 페르소나와 실시간 대화 기능
   - 과거 대화 내용을 기반으로 한 맥락 있는 응답 제공

4. **감정 분석 및 인사이트**
   - 일기 내용을 바탕으로 한 심층적인 감정 분석
   - 주간/월간 감정 트렌드 리포트 제공

5. **AI 추천 음악**
   - 분석된 감정에 맞는 맞춤형 음악 추천
   - 사용자의 취향을 학습하여 개인화된 플레이리스트 생성

6. **소셜 네트워킹**
   - 다른 사용자의 일기에 댓글 및 반응 남기기
   - 페르소나 간 소통 기능을 통한 독특한 사회적 경험 제공

7. **프라이버시 설정**
   - 세밀한 공개 범위 설정 옵션
   - 엔드-투-엔드 암호화를 통한 데이터 보안 강화

## 기술 스택

### 프론트엔드
- **React Native**: 크로스 플랫폼 모바일 앱 개발을 위한 프레임워크
- **Expo**: 빠른 개발과 배포를 위한 React Native 도구
- **Redux Toolkit**: 상태 관리 라이브러리
- **React Navigation**: 앱 내 화면 전환 및 네비게이션 관리
- **React Native Elements**: UI 컴포넌트 라이브러리
- **Lottie**: 고품질 애니메이션 구현

### 백엔드
- **Firebase**: 실시간 데이터베이스, 인증, 호스팅 서비스
- **Fast API**: 서버 사이드 로직 구현

### AI 및 머신러닝
- **TensorFlow.js**: 클라이언트 사이드 머신러닝 모델 실행
- **OpenAI GPT-4**: 자연어 처리 및 대화 생성

### 개발 도구
- **Git & GitHub**: 버전 관리 및 협업
- **Jest**: JavaScript 테스팅 프레임워크
- **ESLint & Prettier**: 코드 품질 및 스타일 관리
- **GitHub Actions**: CI/CD 파이프라인 구축

## 설치 및 실행

1. 저장소를 클론합니다:
   ```
   git clone https://github.com/AIX-GANGNAM/mirrorgram-app.git
   ```

2. 프로젝트 디렉토리로 이동합니다:
   ```
   cd mirrorgram-app
   ```

3. 필요한 패키지를 설치합니다:
   ```
   npm install
   ```

4. 환경 변수를 설정합니다:
   - .env 파일 생성후 firebase api key 삽입합니다.

5. 개발 서버를 실행합니다:
   ```
   npx expo start
   ```

6. Expo Go 앱을 사용하여 QR 코드를 스캔하거나, 시뮬레이터에서 앱을 실행합니다.

## 주요 AI 기술 상세 설명

1. **이미지 생성 (부캐 캐릭터 생성)**
   - InstantID 및 ipadapter 기술을 활용하여 사용자 입력 이미지로부터 다양한 스타일과 표정의 캐릭터 생성
   - Lora 학습 기법을 통한 개인화된 AI 프로필 생성 (10장 내외의 사진으로 학습)

2. **RAG (Retrieval-Augmented Generation)**
   - 벡터 데이터베이스를 활용한 효율적인 정보 검색
   - 프롬프트 엔지니어링을 통한 맥락에 맞는 응답 생성
   - 페르소나의 글쓰기, 댓글 작성, 대화 기능에 활용

3. **이미지 인식**
   - 딥러닝 기반 얼굴 인식 및 감정 분석
   - 객체 탐지를 통한 이미지 내용 자동 태깅

4. **감정 분석**
   - 자연어 처리(NLP) 기술을 활용한 텍스트 감정 분석
   - 멀티모달 학습을 통한 텍스트와 이미지 통합 감정 분석

5. **음악 생성**
   - 감정 상태에 따른 맞춤형 BGM 생성
   - 사용자 취향 학습을 통한 개인화된 음악 추천 알고리즘

## 프로젝트 구조

```
my-emotional-diary/
├── assets/
├── src/
│   ├── components/
│   ├── screens/
│   ├── navigation/
│   ├── redux/
│   ├── services/
│   ├── utils/
│   └── App.js
├── .env
├── app.json
├── babel.config.js
├── package.json
└── README.md
```

