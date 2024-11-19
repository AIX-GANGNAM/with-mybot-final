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
from firebase_admin import credentials, firestore, initialize_app
import firebase_admin
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

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
    # chrome_options.add_argument("--headless")  # 보안 모드에서 Chrome을 열지 않도록 설정
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)

    # Chrome WebDriver 설정
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

    # URL 크롤링 및 기사 내용 및 이미지 출력
    try:
        driver.get(url)
        WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.CLASS_NAME, "news_tit")))

        page_source = driver.page_source
        soup = BeautifulSoup(page_source, 'html.parser')

        # 네이버 뉴스 기사 링크 하나 출력
        article = soup.find('a', class_='news_tit')
        if article:
            link = article['href']
            print(f"기사 링크: {link}")

            # 기사 본문 및 이미지 출력
            driver.get(link)
            WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(random.uniform(3, 7))

            article_page = driver.page_source
            article_soup = BeautifulSoup(article_page, 'html.parser')

            # 기사 본문 출력
            paragraphs = article_soup.find_all(['p', 'div', 'span'], class_=lambda x: x and ('content' in x or 'article' in x))
            content = "\n".join([para.get_text().strip() for para in paragraphs if para.get_text().strip()])

            # 기사 이미지 출력
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
            "기믈이": "한장 구정적이고 납관적인 시각으로 세상을 부르면, 모든 일에서 좋은 점을 찾으려 노력합니다.",
            "화난이": "불의에 대해 체팔을 못하고 쉽게 화를 내면, 집설적이고 공격적인 언어를 사용하고는 합니다.",
            "깊일이": "모든 것에 대해 비판적이고 뇨소적인 태도를 보이며, 날치른 지점을 즐길 수 있습니다.",
            "슬항이": "세상의 어둡은 메일을 자주 받으면, 소리를 쉽게 줄어서 놓고 벌어지는 확이 많습니다.",
            "선비": "학식이 높고 풍함이 바르며, 독서가 높은 어른의 범구에 유린적인 범위도에 대해 이어졌습니다.",
        }

        emoji_map = {
            "기믈이": "😊👍",
            "화난이": "😡👊",
            "깊일이": "😒🙄",
            "슬항이": "😢💔",
            "선비": "🤮📚",
        }

        temperature_map = {
            "기믈이": 0.9,
            "화난이": 0.8,
            "깊일이": 0.7,
            "슬항이": 0.6,
            "선비": 0.5,
        }

        persona_feeds = []
        for persona in persona_descriptions.keys():
            selected_emoji = emoji_map.get(persona, "")
            selected_temperature = temperature_map.get(persona, 0.7)

            persona_prompt = (
                f"기사 요약: \n{summarized_text}\n\n"
                f"당신은 '스터인'이라는 여성으로 '구문의'안이해지 고장이요."
            )

    except Exception as e:
        print(f"피드 작성 중 오류 발생: {e}")

if __name__ == "__main__":
    fetch_trending_keywords()
