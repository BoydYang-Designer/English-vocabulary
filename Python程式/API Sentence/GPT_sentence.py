import pandas as pd
import os
from openai import OpenAI
from tkinter import Tk, filedialog

# 初始化 OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 選擇 Excel 檔
Tk().withdraw()
file_path = filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx")])
df = pd.read_excel(file_path)

# 使用者輸入要生成的數量
num_to_generate = int(input("請輸入要生成的數量（例如 10）："))

# 篩選中文欄位空值的列
df_to_process = df[df['中文'].isna()].head(num_to_generate)

# Excel 資料夾路徑
folder_path = os.path.dirname(file_path)

for index, row in df_to_process.iterrows():
    sentence = row['句子']
    word = row['Words']
    
    # 生成 mp3 音檔
    mp3_path = os.path.join(folder_path, f"{word}.mp3")
    with client.audio.speech.with_streaming_response.create(
        model="gpt-4o-mini-tts",
        voice="alloy",
        input=sentence
    ) as response:
        response.stream_to_file(mp3_path)
    
    # 翻譯成繁體中文
    translation_resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "請將英文翻譯成繁體中文。"},
            {"role": "user", "content": sentence}
        ]
    )
    translated_text = translation_resp.choices[0].message.content
    df.loc[index, '中文'] = translated_text

# 儲存 Excel，保持其他欄位不變
df.to_excel(file_path, index=False)
print(f"✅ 完成 {len(df_to_process)} 個 Words 的音檔與中文翻譯")
