# llm_server.py
import sys
from transformers import AutoModelForCausalLM, AutoTokenizer

url = "bigcode/starcoderbase-1b"

model = AutoModelForCausalLM.from_pretrained(url)
tokenizer = AutoTokenizer.from_pretrained(url)

for line in sys.stdin:
    try:
        inputs = tokenizer(line, return_tensors="pt")
        outputs = model.generate(**inputs)
        response = {tokenizer.decode(outputs[0], skip_special_tokens=True)}
        print(response, flush=True)
    except Exception as e:
        print({"error": str(e)}, flush=True,file=sys.stderr)

