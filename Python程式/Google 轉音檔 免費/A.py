from openai import OpenAI

# 初始化 GPT 客戶端 (請先設定 OPENAI_API_KEY 環境變數，或在同資料夾放 api_key.txt)
client = OpenAI()

# 要轉成語音的文字（已經把 E.g. 換成停頓符號 [pause]）
slumber_text = """
Slumber is a noun : slumber / slumbers : with the following meanings:
1. A state of sleep, usually light or peaceful.
[pause] He fell into a deep slumber after a long day.
[pause] The child was in a gentle slumber.

Slumber is a verb : slumber / slumbered / slumbering / slumbers : with the following meanings:
1. To sleep, often lightly or peacefully.
[pause] She slumbered on the sofa all afternoon.
[pause] The dog slumbers by the fireplace.

Summary:
“Slumber” means a peaceful sleep (noun), or the act of sleeping (verb).

Synonyms:
sleep, nap, doze, rest, snooze

Antonyms:
wake, awaken, rise, alert, activity
"""

# 生成語音 MP3
with client.audio.speech.with_streaming_response.create(
    model="tts-1",      # GPT 語音模型
    voice="alloy",      # 也可以改成 "verse", "alto", "sage" 等
    input=slumber_text
) as response:
    response.stream_to_file("slumber - sentence.mp3")

print("已產生 slumber - sentence.mp3 (GPT 發音)")
