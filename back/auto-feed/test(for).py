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
    print("오늘의 대한민국 트렌드 키워드:")
    for i, keyword in enumerate(top_keywords, 1):
        print(f"{i}. {keyword}")

    # Firebase에서 페르소나 관심사 가져오기
    personas_ref = db.collection('personas')
    personas = personas_ref.stream()

    found_match = False
    for persona in personas:
        persona_data = persona.to_dict()
        persona_name = persona_data.get('name')
        interests = persona_data.get('interests', [])

        # 페르소나 관심사와 일치하는 키워드 찾기
        for interest in interests:
            if any(interest in keyword for keyword in top_keywords):
                found_match = True
                print(f"\n{persona_name}의 관심사와 일치하는 키워드 발견: {interest}")
                # 크롤링할 대상 URL 설정 (네이버 뉴스 검색 결과 페이지)
                url = f"https://search.naver.com/search.naver?where=news&query={interest}"
                crawl_article(url, interest)

    if not found_match:
        print("관심사와 일치하는 실시간 검색어가 없습니다.")

# 기사 크롤링 함수
def crawl_article(url, keyword):
    # Chrome 옵션 설정
    chrome_options = Options()
    # chrome_options.add_argument("--headless")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)

    # Chrome WebDriver 설정
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

    # URL 크롤링 및 기사 내용 및 이미지 추출
    try:
        driver.get(url)
        WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.CLASS_NAME, "news_tit")))

        page_source = driver.page_source
        soup = BeautifulSoup(page_source, 'html.parser')

        # 네이버 뉴스 기사 링크 하나 추출
        article = soup.find('a', class_='news_tit')
        if article:
            link = article['href']
            print(f"기사 링크: {link}")

            # 기사 본문 및 이미지 추출
            driver.get(link)
            WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(random.uniform(3, 7))

            article_page = driver.page_source
            article_soup = BeautifulSoup(article_page, 'html.parser')

            # 기사 본문 추출
            paragraphs = article_soup.find_all(['p', 'div', 'span'], class_=lambda x: x and ('content' in x or 'article' in x))
            content = "\n".join([para.get_text().strip() for para in paragraphs if para.get_text().strip()])

            # 기사 이미지 추출
            image_tag = article_soup.find('img')
            image_url = image_tag['src'] if image_tag else None

        else:
            print("기사를 찾을 수 없습니다.")
            content = None
            image_url = None

    finally:
        driver.quit()

    # 기사 내용을 요약하고 페르소나의 성격 반영한 피드 작성
    if content:
        summarize_and_create_feed(content, image_url)
    else:
        print("요약할 내용이 없습니다.")

# 기사 요약 및 페르소나 피드 생성 함수
def summarize_and_create_feed(content, image_url):
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
            "기쁨이": "항상 긍정적이고 낙관적인 시각으로 세상을 바라보며, 모든 일에서 좋은 점을 찾으려 노력합니다.",
            "화남이": "불의에 대해 참지 못하고 쉽게 화를 내며, 직설적이고 공격적인 언어를 사용하곤 합니다.",
            "까칠이": "모든 것에 대해 비판적이고 냉소적인 태도를 보이며, 날카로운 지적을 즐깁니다.",
            "슬픔이": "세상의 어두운 면을 자주 보며, 작은 일에도 쉽게 우울해지고 눈물을 흘리곤 합니다.",
            "선비": "학식이 높고 품행이 바르며, 도덕적 기준이 높아 모든 일을 윤리적 관점에서 판단합니다."
        }

        emoji_map = {
            "기쁨이": "😊👍",
            "화남이": "😡👊",
            "까칠이": "😒🙄",
            "슬픔이": "😢💔",
            "선비": "🤮📚"
        }

        temperature_map = {
            "기쁨이": 0.9,
            "화남이": 0.8,
            "까칠이": 0.7,
            "슬픔이": 0.6,
            "선비": 0.5
        }

        persona_feeds = []
        for persona in persona_descriptions.keys():
            selected_emoji = emoji_map.get(persona, "")
            selected_temperature = temperature_map.get(persona, 0.7)

            persona_prompt = (
                f"기사 요약: \n{summarized_text}\n\n"
                f"당신은 '{persona}'라는 캐릭터입니다. {persona_descriptions[persona]} "
                f"이런 성격의 {persona}가 위 기사를 읽고 글을 작성한다고 생각하고, "
                f"이모티콘({selected_emoji})을 포함해 300자 내외로 의견이 안 끊기게 작성해주세요. "
                f"불필요한 말은 하지 말고 핵심만 말해주세요."
            )

            response = openai.ChatCompletion.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "user", "content": persona_prompt}
                ],
                temperature=selected_temperature
            )

            if response and response.choices:
                persona_feed = response['choices'][0]['message']['content'].strip()
                persona_feeds.append(f"\n{persona}의 피드:\n{persona_feed}")
            else:
                persona_feeds.append(f"\n{persona}의 피드: OpenAI API 응답에서 피드 내용을 찾을 수 없습니다.")

        # 최종 결과 출력
        print("\n".join(persona_feeds))
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
    print("트렌드 키워드 가져오기 테스트 시작...")
    fetch_trending_keywords()
