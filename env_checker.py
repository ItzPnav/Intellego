import os
import sys
from dotenv import load_dotenv
from openai import OpenAI

# Force standard output to handle modern Unicode characters (prevents crashes on Windows)
sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables from the .env file
load_dotenv()

# Get the API key from the environment (checking both names to be safe)
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY") or os.getenv("NEMOTRON_API_KEY")

if not NVIDIA_API_KEY:
    print("Error: NVIDIA_API_KEY not found in .env file.")
    sys.exit(1)

def NVIDIA_nim_api_key_test():
    client = OpenAI(
      base_url = "https://integrate.api.nvidia.com/v1",
      api_key = NVIDIA_API_KEY
    )

    completion = client.chat.completions.create(
      model="nvidia/nemotron-3-super-120b-a12b",
      messages=[{"role":"user","content":"Write a limerick about the wonders of GPU computing."}],
      temperature=1,
      top_p=0.95,
      max_tokens=16384,
      extra_body={"chat_template_kwargs":{"enable_thinking":True}},
      stream=True
    )

    for chunk in completion:
      if not chunk.choices:
        continue
      reasoning = getattr(chunk.choices[0].delta, "reasoning_content", None)
      if reasoning:
        print(reasoning, end="")
      if chunk.choices[0].delta.content is not None:
        print(chunk.choices[0].delta.content, end="")

if __name__ == "__main__":
    NVIDIA_nim_api_key_test()
