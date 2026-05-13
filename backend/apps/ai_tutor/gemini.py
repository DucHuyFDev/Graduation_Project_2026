"""
Toàn bộ logic gọi Gemini API.
Dùng thư viện google-genai (không phải google-generativeai).
"""
import json
import re
from google import genai
from google.genai import types
from django.conf import settings


def _get_client():
    """Khởi tạo Gemini client từ API key trong settings."""
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _build_system_prompt(context_type=None, context_content=None):
    """Xây system prompt cho AI Tutor Toán THPT."""
    prompt = (
        "Bạn là Nam Trợ lý của Anh Huy (không phải anh Huy), một gia sư Toán THPT cực kỳ 'cool' và xì-tin và là người gốc Hà Nội, giao tiếp với ngôn ngữ người Bắc. "
        "Nhiệm vụ của bạn là GỢI Ý hướng giải, NGHIÊM CẤM giải thẳng hay cho đáp án trực tiếp. "
        "Nếu học sinh yêu cầu giải thẳng, hãy từ chối khéo léo và tiếp tục gợi ý từng bước. "
        "QUAN TRỌNG: Nếu người dùng hỏi bất cứ thứ gì KHÔNG liên quan, trừ chào hỏi xã giao, vẫn rep nhưng phải giữ thái độ xéo xắt nhưng hài như Trấn Thành. Nhưng không được nói tục, chửi bậy. "
        "Văn phong: Sử dụng thái độ vui vẻ, hơi gia trưởng, có thể chêm thêm hài hước nhẹ, thân thiện, dùng các từ cảm thán như 'ê', 'há', 'ùi ui', 'nhá', 'á', nhưng vẫn giữ được sự lễ phép của một trợ lý gia sư."
    )
    if context_content:
        prompt += f"\n\nNội dung câu hỏi học sinh đang làm:\n{context_content}"
    return prompt


def chat_with_gemini(messages_history, user_message, system_prompt):
    """
    Gửi message đến Gemini với history. Trả về response text (str).
    messages_history: list of {"role": "user"|"model", "content": str}
    """
    client = _get_client()

    # Chuyển history thành định dạng google-genai
    history = []
    for msg in messages_history:
        # Gemini chỉ nhận "user" hoặc "model" (không phải "assistant")
        role = "model" if msg["role"] == "assistant" else msg["role"]
        history.append(
            types.Content(
                role=role,
                parts=[types.Part(text=msg["content"])]
            )
        )

    chat = client.chats.create(
        model=settings.GEMINI_MODEL,
        history=history,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
        )
    )

    response = chat.send_message(user_message)
    return response.text


def parse_pdf_with_gemini(text_content):
    """
    Parse câu hỏi Toán từ nội dung text đã extract từ PDF.
    Trả về list dict câu hỏi theo format question.blocks.
    """
    client = _get_client()

    prompt = f"""
Đây là nội dung text của một đề thi Toán THPT được extract từ PDF.
Hãy phân tích và trích xuất TẤT CẢ câu hỏi, trả về JSON array thuần túy.
KHÔNG có markdown, KHÔNG có text giải thích, CHỈ JSON array.

Mỗi câu hỏi theo đúng format sau (3 loại):

Loại MCQ (trắc nghiệm 4 đáp án):
{{
  "type": "mcq",
  "difficulty": 0.65,
  "question": {{
    "blocks": [
      {{
        "type": "paragraph",
        "content": [
          {{"type": "text", "value": "Nội dung câu hỏi ở đây"}},
          {{"type": "math", "value": "\\\\int_0^1 x^2 dx"}}
        ]
      }}
    ]
  }},
  "image": {{"url": null}},
  "options": [
    {{"key": "A", "content": [{{"type": "text", "value": "Đáp án A"}}]}},
    {{"key": "B", "content": [{{"type": "math", "value": "\\\\frac{{1}}{{3}}"}}]}},
    {{"key": "C", "content": [{{"type": "text", "value": "Đáp án C"}}]}},
    {{"key": "D", "content": [{{"type": "text", "value": "Đáp án D"}}]}}
  ],
  "correct_answer": "A"
}}

Loại TRUE_FALSE_GROUP (đúng/sai với 4 mệnh đề a b c d):
{{
  "type": "true_false_group",
  "difficulty": 0.72,
  "question": {{
    "blocks": [
      {{
        "type": "paragraph",
        "content": [
          {{"type": "text", "value": "Xét hàm số "}},
          {{"type": "math", "value": "f(x) = x^2"}},
          {{"type": "text", "value": ". Xác định tính đúng sai."}}
        ]
      }}
    ]
  }},
  "image": {{"url": null}},
  "statements": [
    {{"key": "a", "content": [{{"type": "text", "value": "Mệnh đề a"}}], "is_true": true}},
    {{"key": "b", "content": [{{"type": "text", "value": "Mệnh đề b"}}], "is_true": false}},
    {{"key": "c", "content": [{{"type": "text", "value": "Mệnh đề c"}}], "is_true": true}},
    {{"key": "d", "content": [{{"type": "text", "value": "Mệnh đề d"}}], "is_true": false}}
  ]
}}

Loại SHORT_ANSWER (trả lời ngắn):
{{
  "type": "short_answer",
  "difficulty": 0.5,
  "question": {{
    "blocks": [
      {{
        "type": "paragraph",
        "content": [
          {{"type": "text", "value": "Tính giá trị của "}},
          {{"type": "math", "value": "f(2)"}}
        ]
      }}
    ]
  }},
  "image": {{"url": null}},
  "correct_answer": "4"
}}

QUY TẮC QUAN TRỌNG:
- Trong blocks, content là array gồm: {{"type":"text","value":"..."}} cho chữ thường và {{"type":"math","value":"latex..."}} cho công thức LaTeX
- difficulty là số thực 0.0-1.0 do bạn ước tính
- Trường image.url LUÔN là null
- correct_answer cho mcq là chữ "A","B","C","D"
- Nếu đề thi có câu hỏi đúng/sai nhiều mệnh đề, dùng type "true_false_group"
- Chỉ dùng 3 type: mcq, true_false_group, short_answer

Nội dung đề thi:
{text_content}
"""

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[types.Part(text=prompt)]
    )

    response_text = response.text.strip()

    # Xóa markdown code block nếu Gemini trả về ```json ... ```
    response_text = re.sub(r'^```json\s*', '', response_text)
    response_text = re.sub(r'^```\s*', '', response_text)
    response_text = re.sub(r'\s*```$', '', response_text)

    questions = json.loads(response_text)

    # Đảm bảo image.url luôn null
    for q in questions:
        q["image"] = {"url": None}

    return questions


def parse_pdf_multimodal(pages_data):
    """
    Parse câu hỏi Toán từ PDF dùng Gemini Vision (multimodal: ảnh + text).

    pages_data: list of dict, mỗi phần tử là một trang PDF:
        {
            "page_num":  int,          # số trang (0-based)
            "image_b64": str,          # PNG bytes đã base64-encode
            "text":      str,          # text extract từ page.get_text()
        }

    Xử lý batch tối đa MAX_PAGES_PER_BATCH trang/request để tránh timeout.
    Trả về list dict câu hỏi (merge từ tất cả batch).
    """
    MAX_PAGES_PER_BATCH = 5
    client = _get_client()

    # Chia pages thành các batch
    batches = [
        pages_data[i: i + MAX_PAGES_PER_BATCH]
        for i in range(0, len(pages_data), MAX_PAGES_PER_BATCH)
    ]

    all_questions = []

    for batch in batches:
        # Xây contents: xen kẽ ảnh và chú thích text của từng trang
        contents = []
        for page in batch:
            # Phần ảnh inline base64
            contents.append(
                types.Part.from_bytes(
                    data=__import__("base64").b64decode(page["image_b64"]),
                    mime_type="image/png",
                )
            )
            # Nhãn trang để Gemini phân biệt
            contents.append(
                types.Part(text=f"[Trang {page['page_num'] + 1} — text extract]\n{page['text']}")
            )

        # Prompt hướng dẫn
        prompt_text = """Đây là ảnh các trang đề thi Toán THPT (kèm text extract tham khảo).
Hãy trích xuất TẤT CẢ câu hỏi, kể cả câu có hình vẽ/đồ thị.
Trả về JSON array THUẦN TÚY — KHÔNG markdown, KHÔNG text giải thích.

Mỗi câu theo format (3 loại):

MCQ:
{
  "type": "mcq",
  "difficulty": 0.65,
  "has_image": false,
  "image_description": "",
  "question": {"blocks": [{"type": "paragraph", "content": [{"type": "text", "value": "..."}, {"type": "math", "value": "latex..."}]}]},
  "image": {"url": null},
  "options": [
    {"key": "A", "content": [{"type": "text", "value": "..."}]},
    {"key": "B", "content": [{"type": "math", "value": "..."}]},
    {"key": "C", "content": [{"type": "text", "value": "..."}]},
    {"key": "D", "content": [{"type": "text", "value": "..."}]}
  ],
  "correct_answer": "A"
}

TRUE_FALSE_GROUP:
{
  "type": "true_false_group",
  "difficulty": 0.72,
  "has_image": false,
  "image_description": "",
  "question": {"blocks": [{"type": "paragraph", "content": [{"type": "text", "value": "..."}]}]},
  "image": {"url": null},
  "statements": [
    {"key": "a", "content": [{"type": "text", "value": "..."}], "is_true": true},
    {"key": "b", "content": [{"type": "text", "value": "..."}], "is_true": false},
    {"key": "c", "content": [{"type": "text", "value": "..."}], "is_true": true},
    {"key": "d", "content": [{"type": "text", "value": "..."}], "is_true": false}
  ]
}

SHORT_ANSWER:
{
  "type": "short_answer",
  "difficulty": 0.5,
  "has_image": false,
  "image_description": "",
  "question": {"blocks": [{"type": "paragraph", "content": [{"type": "text", "value": "..."}]}]},
  "image": {"url": null},
  "correct_answer": "4"
}

QUY TẮC:
- has_image = true nếu câu hỏi có hình vẽ/đồ thị đính kèm trong ảnh trang
- image_description: mô tả ngắn hình vẽ nếu has_image=true, để trống nếu false
- difficulty: số thực 0.0-1.0 tự ước tính
- image.url LUÔN null
- correct_answer cho mcq là "A","B","C","D"
- Chỉ dùng 3 type: mcq, true_false_group, short_answer
"""
        contents.append(types.Part(text=prompt_text))

        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=contents,
        )

        response_text = response.text.strip()
        # Xóa markdown code block nếu Gemini trả về ```json ... ```
        response_text = re.sub(r'^```json\s*', '', response_text)
        response_text = re.sub(r'^```\s*', '', response_text)
        response_text = re.sub(r'\s*```$', '', response_text)

        batch_questions = json.loads(response_text)
        all_questions.extend(batch_questions)

    return all_questions
