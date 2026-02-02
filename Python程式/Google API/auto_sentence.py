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
df_to_process = df[df['中文'].isna()]

# Excel 資料夾路徑
folder_path = os.path.dirname(file_path)

count_done = 0  # 記錄已處理數量

for index, row in df_to_process.iterrows():
    if count_done >= num_to_generate:
        break  # 已達設定生成數量，停止
    
    sentence = row['句子']
    word = row['Words']
    mp3_path = os.path.join(folder_path, f"{word}.mp3")
    
    # 檢查 mp3 是否已存在
    if os.path.exists(mp3_path):
        print(f"{word}.mp3 已存在，跳過生成")
    else:
        # 生成 mp3 音檔
        with client.audio.speech.with_streaming_response.create(
            model="gpt-4o-mini-tts",
            voice="alloy",
            input=sentence
        ) as response:
            response.stream_to_file(mp3_path)
        print(f"{word}.mp3 已生成")
    
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
    
    count_done += 1

# 儲存 Excel，保持其他欄位不變
df.to_excel(file_path, index=False)
print(f"✅ 完成 {count_done} 個 Words 的音檔與中文翻譯")
