import whisper
import os
from tkinter import Tk
from tkinter.filedialog import askopenfilename

# 選擇 MP3 檔
Tk().withdraw()
file_path = askopenfilename(title="Select MP3 file", filetypes=[("MP3 files", "*.mp3")])
if not file_path:
    print("No file selected. Exiting...")
    exit()

# 選擇運行裝置
import torch
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# 載入模型
model = whisper.load_model("base", device=device)

# 轉錄
result = model.transcribe(file_path, language="en", verbose=True)

# 生成同名 TXT
txt_path = os.path.splitext(file_path)[0] + ".txt"
with open(txt_path, "w", encoding="utf-8") as f:
    f.write(result["text"])

print(f"Transcription completed! Saved to: {txt_path}")
