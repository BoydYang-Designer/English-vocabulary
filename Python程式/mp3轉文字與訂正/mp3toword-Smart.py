import whisper
import os
import torch
from tkinter import Tk, messagebox, simpledialog
from tkinter.filedialog import askopenfilenames
import re

def format_timestamp(seconds: float) -> str:
    """
    將秒數(浮點數)轉換為 H:MM:SS.mmm 格式的字串。
    """
    assert seconds >= 0, "non-negative timestamp expected"
    milliseconds = round(seconds * 1000.0)

    hours = milliseconds // 3_600_000
    milliseconds %= 3_600_000
    minutes = milliseconds // 60_000
    milliseconds %= 60_000
    seconds_int = milliseconds // 1_000
    milliseconds_rem = milliseconds % 1_000

    return f"{hours:02}:{minutes:02}:{seconds_int:02}.{milliseconds_rem:03}"

def format_plain_text_with_paragraphs(text, sentences_per_paragraph=3):
    """
    將純文字智能分段，提升可讀性
    
    參數:
    - text: 原始文字
    - sentences_per_paragraph: 每段包含的句子數（預設3句）
    
    返回:
    - 分段後的文字
    """
    # 定義句子結束標點
    sentence_endings = r'([.!?。!?]+)'
    
    # 用正則表達式分割句子，保留標點符號
    sentences = re.split(sentence_endings, text)
    
    # 重新組合句子和標點
    combined_sentences = []
    i = 0
    while i < len(sentences):
        if i + 1 < len(sentences) and re.match(sentence_endings, sentences[i + 1]):
            # 合併句子和其標點
            combined_sentences.append(sentences[i] + sentences[i + 1])
            i += 2
        elif sentences[i].strip():
            # 單獨的句子（沒有配對標點）
            combined_sentences.append(sentences[i])
            i += 1
        else:
            i += 1
    
    # 按照每段句子數分段
    paragraphs = []
    for i in range(0, len(combined_sentences), sentences_per_paragraph):
        paragraph_sentences = combined_sentences[i:i + sentences_per_paragraph]
        paragraph = ' '.join(s.strip() for s in paragraph_sentences if s.strip())
        if paragraph:
            paragraphs.append(paragraph)
    
    # 用雙換行符號連接段落
    return '\n\n'.join(paragraphs)

def smart_sentence_split(segments, max_gap=1.5, max_duration=10.0):
    """
    智能斷句:根據標點符號和時間間隔進行更精準的分段
    
    參數:
    - segments: Whisper 返回的原始分段(帶詞級時間戳記)
    - max_gap: 兩個詞之間的最大間隔(秒),超過此值視為新句子
    - max_duration: 單句最大時長(秒),超過則強制分段
    
    返回:
    - 新的分段列表,每個元素包含 start, end, text
    """
    sentence_endings = {'.', '!', '?', '。', '!', '?'}
    pause_punctuations = {',', ';', ':', ',', ';', ':'}
    
    new_segments = []
    current_sentence = {
        'start': None,
        'end': None,
        'text': ''
    }
    
    for segment in segments:
        # 如果有詞級時間戳記,使用詞級;否則使用段級
        if 'words' in segment and segment['words']:
            words = segment['words']
        else:
            # 沒有詞級時間戳記,直接使用整個段落
            if current_sentence['start'] is None:
                current_sentence['start'] = segment['start']
            
            current_sentence['end'] = segment['end']
            current_sentence['text'] += ' ' + segment['text'].strip()
            
            # 檢查是否該分段
            text = segment['text'].strip()
            if text and text[-1] in sentence_endings:
                new_segments.append({
                    'start': current_sentence['start'],
                    'end': current_sentence['end'],
                    'text': current_sentence['text'].strip()
                })
                current_sentence = {'start': None, 'end': None, 'text': ''}
            continue
        
        for i, word_info in enumerate(words):
            word = word_info.get('word', '').strip()
            word_start = word_info.get('start', word_info.get('timestamp', [None, None])[0])
            word_end = word_info.get('end', word_info.get('timestamp', [None, None])[1])
            
            if word_start is None:
                continue
            
            # 初始化當前句子的開始時間
            if current_sentence['start'] is None:
                current_sentence['start'] = word_start
            
            # 檢查是否需要因為時間間隔而分段
            if current_sentence['text'] and (word_start - current_sentence['end']) > max_gap:
                new_segments.append({
                    'start': current_sentence['start'],
                    'end': current_sentence['end'],
                    'text': current_sentence['text'].strip()
                })
                current_sentence = {
                    'start': word_start,
                    'end': word_end if word_end else word_start,
                    'text': word
                }
                continue
            
            # 檢查是否需要因為時長而分段
            if current_sentence['end'] and (word_end - current_sentence['start']) > max_duration:
                # 如果當前詞有標點,在此分段
                if word and word[-1] in sentence_endings.union(pause_punctuations):
                    current_sentence['end'] = word_end if word_end else word_start
                    current_sentence['text'] += ' ' + word
                    new_segments.append({
                        'start': current_sentence['start'],
                        'end': current_sentence['end'],
                        'text': current_sentence['text'].strip()
                    })
                    current_sentence = {'start': None, 'end': None, 'text': ''}
                    continue
            
            # 添加詞到當前句子
            current_sentence['end'] = word_end if word_end else word_start
            current_sentence['text'] += ' ' + word
            
            # 檢查句尾標點
            if word and word[-1] in sentence_endings:
                new_segments.append({
                    'start': current_sentence['start'],
                    'end': current_sentence['end'],
                    'text': current_sentence['text'].strip()
                })
                current_sentence = {'start': None, 'end': None, 'text': ''}
    
    # 處理最後一個未完成的句子
    if current_sentence['text'].strip():
        new_segments.append({
            'start': current_sentence['start'],
            'end': current_sentence['end'],
            'text': current_sentence['text'].strip()
        })
    
    return new_segments

# --- 步驟 1: 選擇多個 MP3 檔 ---
root = Tk()
root.withdraw()  # 隱藏主視窗

file_paths = askopenfilenames(
    title="Select one or more MP3 files", 
    filetypes=[("MP3 files", "*.mp3"), ("All audio files", "*.mp3 *.wav *.m4a")]
)

if not file_paths:
    print("No files selected. Exiting...")
    exit()

print(f"已選擇 {len(file_paths)} 個檔案。")

# --- 步驟 2: 選擇儲存格式 ---
save_plain = messagebox.askyesno(
    "儲存選項", 
    "您是否要儲存「純文字」版本?\n(例如: MyAudio.txt)"
)

save_timestamp = messagebox.askyesno(
    "儲存選項", 
    "您是否要儲存「時間戳記」版本?\n(例如: MyAudio Timestamp.txt)"
)

# --- 直接使用智能斷句 ---
use_smart_split = True  # 固定使用智能斷句

if not save_plain and not save_timestamp:
    print("您沒有選擇任何儲存格式。程式即將結束...")
    exit()

# --- 步驟 3: 載入模型與裝置 ---
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# 定義 Whisper 使用的取樣率 (16kHz)
WHISPER_SAMPLE_RATE = 16000

# 詢問使用哪個模型 (可選)
model_choice = messagebox.askquestion(
    "模型選擇",
    "使用更精準的 'small' 模型?\n\n"
    "● Yes: 更精準但較慢 (推薦)\n"
    "● No: 使用 'base' 模型 (較快)"
)

model_name = "small" if model_choice == "yes" else "base"
print(f"正在載入 '{model_name}' 模型...")
model = whisper.load_model(model_name, device=device)
print("模型載入完成。")

# --- 步驟 4: 遍歷並處理所有檔案 ---
for i, file_path in enumerate(file_paths):
    print(f"\n--- 正在處理檔案 {i + 1} / {len(file_paths)} ---")
    print(f"原始路徑: {file_path}")

    try:
        # 分離路徑與檔名
        directory = os.path.dirname(file_path)
        filename_with_ext = os.path.basename(file_path)
        filename_no_ext = os.path.splitext(filename_with_ext)[0]
        clean_filename = filename_no_ext.strip()
        base_path = os.path.join(directory, clean_filename)
        
        files_to_check = []
        if save_plain:
            files_to_check.append(base_path + ".txt")
        if save_timestamp:
            files_to_check.append(base_path + " Timestamp.txt")
        
        # 檢查是否已存在
        all_exist = False
        if files_to_check: 
            all_exist = all(os.path.exists(f) for f in files_to_check)

        if all_exist:
            print(f"  [跳過] 檔案已存在: {clean_filename}")
            continue 

        # 檢查長度
        audio = whisper.load_audio(file_path)
        duration = audio.shape[0] / WHISPER_SAMPLE_RATE 
        
        if duration < 10:
            print(f"  [跳過] 檔案長度 ({duration:.2f} 秒) 小於 10 秒。")
            continue 
        
        print(f"檔案長度: {duration:.2f} 秒。開始轉錄...")

        # 轉錄 - 啟用詞級時間戳記以支援智能斷句
        result = model.transcribe(
            audio, 
            language="en", 
            verbose=False,
            word_timestamps=True  # 固定啟用詞級時間戳記
        )
        print("轉錄完成。")
        
        # 儲存純文字檔
        if save_plain:
            txt_path = base_path + ".txt"
            try:
                # 使用智能分段功能處理文字
                formatted_text = format_plain_text_with_paragraphs(
                    result["text"],
                    sentences_per_paragraph=3  # 每段3句，可根據需要調整
                )
                with open(txt_path, "w", encoding="utf-8") as f:
                    f.write(formatted_text)
                print(f"  [成功] 已儲存純文字檔（含自動分段）: {os.path.basename(txt_path)}")
            except Exception as e:
                print(f"  [失敗] 儲存純文字檔失敗: {e}")

        # 儲存時間戳記檔
        if save_timestamp:
            # 使用智能斷句
            smart_segments = smart_sentence_split(
                result["segments"],
                max_gap=1.5,      # 詞間隔超過 1.5 秒視為新句
                max_duration=10.0  # 單句最長 10 秒
            )
            timestamp_txt_path = base_path + " Timestamp.txt"
            
            try:
                with open(timestamp_txt_path, "w", encoding="utf-8") as ts_file:
                    for segment in smart_segments:
                        start_time = format_timestamp(segment['start'])
                        end_time = format_timestamp(segment['end'])
                        text = segment['text'].strip()
                        ts_file.write(f"[{start_time} --> {end_time}] {text}\n")
                print(f"  [成功] 已儲存時間戳記檔: {os.path.basename(timestamp_txt_path)}")
            except Exception as e:
                print(f"  [失敗] 儲存時間戳記檔失敗: {e}")

    except Exception as e:
        print(f"[錯誤] 處理檔案 {file_path} 時發生錯誤: {e}")
        continue 

print("\n--- 所有檔案處理完畢 ---")