import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from huggingface_hub import login
from typing import Optional

# Hugging Face 토큰으로 로그인
hf_token = os.getenv("HUGGING_FACE_TOKEN")
if not hf_token:
    raise ValueError("HUGGING_FACE_TOKEN environment variable is not set")
login(hf_token)

# FastAPI 앱 생성
app = FastAPI()

# EXAONE 모델 및 토크나이저 로드
model = AutoModelForCausalLM.from_pretrained(
    "LGAI-EXAONE/EXAONE-3.0-7.8B-Instruct",
    torch_dtype=torch.bfloat16,
    trust_remote_code=True,
    device_map="auto"
)
tokenizer = AutoTokenizer.from_pretrained("LGAI-EXAONE/EXAONE-3.0-7.8B-Instruct")

# API 엔드포인트 구현
@app.post("/generate")
async def generate_text(query: str):
    try:
        inputs = tokenizer(query, return_tensors="pt").to(model.device)
        outputs = model.generate(**inputs)
        return {"response": tokenizer.decode(outputs[0], skip_special_tokens=True)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))