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

# 검색 대상 키워드 설정
keyword = "최동석"

# 크롤링할 대상 URL 설정 (네이버 뉴스 검색 결과 페이지)
url = f"https://search.naver.com/search.naver?where=news&query={keyword}"

# Chrome 옵션 설정
chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
chrome_options.add_argument("--disable-blink-features=AutomationControlled")
chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
chrome_options.add_experimental_option('useAutomationExtension', False)

# Chrome WebDriver 설정
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

# 페르소나 설정
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

# 페르소나별 temperature 설정
temperature_map = {
    "기쁨이": 0.9,
    "화남이": 0.8,
    "까칠이": 0.7,
    "슬픔이": 0.6,
    "선비": 0.5
}

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
            exit()

        # OpenAI API를 사용해 페르소나 성격 반영한 피드 작성
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            print("OpenAI API 키가 설정되지 않았습니다.")
            exit()

        persona_feeds = []
        for persona in persona_descriptions.keys():
            selected_emoji = emoji_map.get(persona, "")
            selected_temperature = temperature_map.get(persona, 0.7)  # 기본값 0.7로 설정

            persona_prompt = (
                f"기사 요약: \n{summarized_text}\n\n"
                f"당신은 '{persona}'라는 캐릭터입니다. {persona_descriptions[persona]} "
                f"이런 성격의 {persona}가 위 기사를 읽고 글을 작성한다고 생각하고, "
                f"이모티콘({selected_emoji})을 포함해 300자 내외로 의견이 안 끊기게 작성해주세요. "
                f"불필요한 말은 하지 말고 핵심만 말해주세요."
            )

            response = openai.ChatCompletion.create(
                model="gpt-4o",
                messages=[
                    {"role": "user", "content": persona_prompt}
                ],
                temperature=selected_temperature  # 페르소나에 따라 temperature 설정
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
else:
    print("요약할 내용이 없습니다.")
