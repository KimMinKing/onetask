from fastapi import APIRouter, Depends
from auth_utils import get_master_user
from pydantic import BaseModel
from dotenv import load_dotenv
import replicate
import os

load_dotenv()

_token = os.getenv("REPLICATE_API_TOKEN", "")
client = replicate.Client(api_token=_token)

router = APIRouter(prefix="/image-test", tags=["image-test"])

# 테스트할 모델 목록
MODELS = {
    "flux-schnell": {
        "id": "black-forest-labs/flux-schnell",
        "label": "FLUX Schnell (빠름)",
        "input": lambda prompt: {
            "prompt": prompt,
            "num_outputs": 1,
            "aspect_ratio": "1:1",
            "output_format": "webp",
            "output_quality": 80,
        },
    },
    "flux-dev": {
        "id": "black-forest-labs/flux-dev",
        "label": "FLUX Dev (고품질)",
        "input": lambda prompt: {
            "prompt": prompt,
            "num_outputs": 1,
            "aspect_ratio": "1:1",
            "output_format": "webp",
            "output_quality": 80,
            "guidance": 3.5,
            "num_inference_steps": 28,
        },
    },
    "sdxl": {
        "id": "stability-ai/sdxl",
        "label": "SDXL",
        "input": lambda prompt: {
            "prompt": prompt,
            "width": 512,
            "height": 512,
            "num_outputs": 1,
            "num_inference_steps": 30,
            "guidance_scale": 7.5,
        },
    },
    "flux-2-pro": {
        "id": "black-forest-labs/flux-2-pro",
        "label": "FLUX 2 Pro (최고품질)",
        "input": lambda prompt: {
            "prompt": prompt,
            "resolution": "1 MP",
            "aspect_ratio": "1:1",
            "output_format": "webp",
            "output_quality": 80,
            "safety_tolerance": 2,
        },
    },
}

# 테스트용 예문들
TEST_PROMPTS = {
    "friendship": {
        "word": "友情 (yǒu qíng)",
        "meaning": "우정",
        "example": "두 친구가 함께 웃으며 벚꽃 아래를 걷고 있다",
    },
    "study": {
        "word": "学习 (xué xí)",
        "meaning": "공부",
        "example": "학생이 책상에 앉아 열심히 책을 읽고 있다",
    },
    "food": {
        "word": "吃饭 (chī fàn)",
        "meaning": "밥 먹다",
        "example": "가족이 둥근 식탁에 둘러앉아 함께 식사를 즐기고 있다",
    },
}

def build_prompt(scene: str, style_suffix: str) -> str:
    return f"anime style illustration, {scene}, soft colors, detailed, Studio Ghibli inspired, {style_suffix}"


class GenerateRequest(BaseModel):
    model_key: str
    scene_key: str = "friendship"


@router.get("/models")
def get_models():
    return [
        {"key": k, "label": v["label"]}
        for k, v in MODELS.items()
    ]


@router.get("/scenes")
def get_scenes():
    return [
        {"key": k, "word": v["word"], "meaning": v["meaning"], "example": v["example"]}
        for k, v in TEST_PROMPTS.items()
    ]


@router.post("/generate")
def generate_image(body: GenerateRequest, _ = Depends(get_master_user)):
    model = MODELS.get(body.model_key)
    scene = TEST_PROMPTS.get(body.scene_key, TEST_PROMPTS["friendship"])

    if not model:
        return {"error": f"모델 '{body.model_key}' 없음"}

    prompt = build_prompt(scene["example"], "vibrant, high quality")

    output = client.run(model["id"], input=model["input"](prompt))

    # output은 list 또는 FileOutput
    if isinstance(output, list):
        url = str(output[0])
    else:
        url = str(output)

    return {
        "url": url,
        "model": model["label"],
        "prompt": prompt,
        "word": scene["word"],
        "meaning": scene["meaning"],
    }
