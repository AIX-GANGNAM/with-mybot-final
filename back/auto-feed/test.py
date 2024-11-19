from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time
import random
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import openai
import os
from pytrends.request import TrendReq
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from firebase_admin import credentials, firestore, initialize_app
import firebase_admin
import dotenv

# .env 파일 로드
dotenv.load_dotenv()

# Firebase 초기화
if not firebase_admin._apps:
    cred = credentials.Certificate('./mybot.json')
    initialize_app(cred)

db = firestore.client()

# pytrends 초기화 및 트렌드 검색 함수 정의
def fetch_trending_keywords():
    pytrends = TrendReq(hl='ko', tz=540)
    trending_searches_df = pytrends.trending_searches(pn='south_korea')
    top_keywords = trending_searches_df[0].tolist()

    # 트렌드 목록 출력
    print("실시간 검색어 키워드 리스트(1~20등) ▼")
    for i, keyword in enumerate(top_keywords, 1):
        print(f"{i}. {keyword}")

    # Firebase에서 페르소나 관심사 가져오기
    personas_ref = db.collection('personas')
    personas = personas_ref.stream()

    found_match = False
    for persona in personas:
        persona_data = persona.to_dict()
        persona_id = persona.id  # 문서 ID 가져오기
        persona_name = persona_id.split('_')[-1]  # 언더바 뒤의 이름 추출
        interests = persona_data.get('interests', [])

        # 페르소나 관심사와 일치하는 키워드 찾기
        matched_keywords = [keyword for keyword in top_keywords if any(interest in keyword for interest in interests)]
        if matched_keywords:
            found_match = True
            for keyword in matched_keywords:
                print(f"\n{persona_name}의 관심사와 일치하는 키워드 발견 : {keyword}")
                crawl_article(f"https://search.naver.com/search.naver?where=news&query={keyword}", keyword, persona_name)

    if not found_match:
        print("관심사와 일치하는 실시간 검색어가 없습니다.")

# 기사 크롤링 함수
def crawl_article(url, keyword, persona_name):
    # Chrome 옵션 설정
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)

    # Chrome WebDriver 설정
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    try:
        # URL 접근 및 페이지 로드
        driver.get(url)
        WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.CLASS_NAME, "news_tit")))

        page_source = driver.page_source
        soup = BeautifulSoup(page_source, 'html.parser')
        keywords = keyword.split()

        # 1차 필터링: 제목에서 1순위 및 3순위 조건 확인
        articles = soup.find_all('a', class_='news_tit')
        primary_article = next((link for link in articles if all(kw in link.get_text() for kw in keywords)), None)
        secondary_article = next((link for link in articles if any(kw in link.get_text() for kw in keywords)), None)

        # 1순위 또는 3순위 조건 충족 시 해당 링크 사용
        article = primary_article if primary_article else secondary_article
        if article:
            link = article['href']
            print(f"선택된 기사 링크: {link}")

            # 본문 및 이미지 추출
            driver.get(link)
            WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            article_page = driver.page_source
            article_soup = BeautifulSoup(article_page, 'html.parser')

            paragraphs = article_soup.find_all(['p', 'div', 'span'], class_=lambda x: x and ('content' in x or 'article' in x))
            content = "\n".join([para.get_text().strip() for para in paragraphs if para.get_text().strip()])

            # 본문 확인: 2순위 및 4순위 조건 충족 여부 검사
            if primary_article or all(kw in content for kw in keywords) or any(kw in content for kw in keywords):
                print("본문에 키워드 조건 충족")
            else:
                content = None

            # 이미지 URL 추출 (메인 이미지 후보 선택)
            image_tags = article_soup.find_all('img')
            max_width = 0
            image_url = None
            for img in image_tags:
                # alt 속성에 기사 관련 내용이 포함된 경우 우선 고려
                alt_text = img.get('alt', '').lower()
                if any(kw in alt_text for kw in keywords):
                    image_url = img.get('data-src') or img.get('src')
                    break
                
                # width가 가장 큰 이미지 선택
                width = img.get('width')
                if width and width.isdigit():
                    width = int(width)
                    if width > max_width:
                        max_width = width
                        image_url = img.get('data-src') or img.get('src')

            # 상대 경로 처리: 절대 경로로 변환
            if image_url and not image_url.startswith('http'):
                base_url = driver.current_url.split('/')[0:3]  # 프로토콜과 도메인 부분 추출
                base_url = '/'.join(base_url)
                image_url = base_url + image_url if image_url.startswith('/') else base_url + '/' + image_url

        else:
            print("제목과 본문에 키워드 조건을 충족하는 기사를 찾을 수 없습니다.")
            content = None
            image_url = None

    finally:
        driver.quit()

    # 기사 요약 및 페르소나 피드 생성
    if content:
        summarize_and_create_feed(content, image_url, persona_name)
    else:
        print("요약할 내용이 없습니다.")

# 기사 요약 및 페르소나 피드 생성 함수
def summarize_and_create_feed(content, image_url, persona_name):
    try:
        # KoBART 요약 모델 로드
        model_name = "gogamza/kobart-summarization"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

        # 기사를 요약하여 길이를 줄임
        inputs = tokenizer([content], max_length=1024, return_tensors="pt", truncation=True)
        summary_ids = model.generate(inputs["input_ids"], max_length=150, min_length=50, length_penalty=2.0, num_beams=4, early_stopping=True)
        summarized_text = tokenizer.decode(summary_ids[0], skip_special_tokens=True)

        if not summarized_text:
            print("요약된 내용이 없습니다.")
            return

        # OpenAI API를 사용해 페르소나 성격 반영한 피드 작성
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            print("OpenAI API 키가 설정되지 않았습니다.")
            return

        persona_descriptions = {
            "joy": "항상 긍정적이고 낙관적인 시각으로 세상을 바라보며, 모든 일에서 좋은 점을 찾으려 노력합니다.",
            "anger": "불의에 대해 참지 못하고 쉽게 화를 내며, 직설적이고 공격적인 언어를 사용하곤 합니다.",
            "disgust": "모든 것에 대해 비판적이고 냉소적인 태도를 보이며, 날카로운 지적을 즐깁니다.",
            "sadness": "세상의 어두운 면을 자주 보며, 작은 일에도 쉽게 우울해지고 눈물을 흘리곤 합니다.",
            "fear": "학식이 높고 품행이 바르며, 도덕적 기준이 높아 모든 일을 윤리적 관점에서 판단합니다."
        }

        emoji_map = {
            "joy": "😊👍",
            "anger": "😡👊",
            "disgust": "😒🙄",
            "sadness": "😢💔",
            "fear": "🤮📚"
        }

        temperature_map = {
            "joy": 0.9,
            "anger": 0.8,
            "disgust": 0.7,
            "sadness": 0.6,
            "fear": 0.5
        }

        if persona_name not in persona_descriptions:
            print(f"알 수 없는 페르소나: {persona_name}")
            return

        selected_emoji = emoji_map.get(persona_name, "")
        selected_temperature = temperature_map.get(persona_name, 0.7)

        persona_prompt = (
            f"기사 요약: \n{summarized_text}\n\n"
            f"당신은 '{persona_name}'라는 캐릭터입니다. {persona_descriptions[persona_name]} "
            f"이런 성격의 {persona_name}가 위 기사를 읽고 글을 작성한다고 생각하고, "
            f"이모티콘({selected_emoji})을 포함해 300자 내외로 의견이 안 끊기게 작성해주세요. "
            f"불필요한 말은 하지 말고 핵심만 말해주세요."
        )

        response = openai.ChatCompletion.create(
            model="gpt-4o-mini", #gpt-3.5-turbo gpt-4o-mini
            messages=[
                {"role": "user", "content": persona_prompt}
            ],
            temperature=selected_temperature
        )

        if response and response.choices:
            persona_feed = response['choices'][0]['message']['content'].strip()
            print(f"\n{persona_name}의 피드:\n{persona_feed}")
        else:
            print(f"\n{persona_name}의 피드: OpenAI API 응답에서 피드 내용을 찾을 수 없습니다.")
        
        if image_url:
            print(f"기사 이미지: {image_url}")

    except Exception as e:
        print(f"피드 작성 중 오류 발생: {e}")

# 스케줄러 설정 및 시작
scheduler = BackgroundScheduler()
scheduler.add_job(fetch_trending_keywords, 'cron', hour='0,12')  # 매일 0시, 12시에 실행
scheduler.start()

# 스크립트 종료 시 스케줄러 정리
atexit.register(lambda: scheduler.shutdown())

# 콘솔에서 테스트
if __name__ == "__main__":
    print("실시간 검색어 가져오기 시작!")
    fetch_trending_keywords()
