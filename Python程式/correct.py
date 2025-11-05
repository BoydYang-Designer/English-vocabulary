import json
import re
import difflib
import sys
import os
import tkinter as tk  # 明確導入
from tkinter import Tk, filedialog

# --- 新增 colorama 導入 ---
try:
    import colorama
    from colorama import Fore, Style, init
    # 初始化 colorama，autoreset=True 會讓顏色在每次 print 後自動重置
    init(autoreset=True)
except ImportError:
    print("錯誤：缺少 'colorama' 函式庫。")
    print("請先執行 'pip install colorama' 來安裝此函式庫。")
    sys.exit()
# --- 導入結束 ---


def select_file(title, filetypes):
    """
    使用 Tkinter 彈出視窗讓使用者選擇【單個】檔案。
    """
    print(f"請選擇 {title}...")
    try:
        root = Tk()
        root.withdraw()  # 隱藏主視窗
        file_path = filedialog.askopenfilename(title=title, filetypes=filetypes)
        root.destroy()
    except tk.TclError:
        print("\n[錯誤] 偵測到 Tkinter (GUI) 環境問題。")
        print("您可能正在沒有圖形介面的環境 (例如 SSH) 中執行。")
        print("程式即將退出。")
        sys.exit()
    
    if not file_path:
        print("未選擇檔案。程式即將退出。")
        sys.exit()
        
    print(f"已選擇: {file_path}")
    return file_path

# --- 新增函式 (支援多選) ---
def select_multiple_files(title, filetypes):
    """
    使用 Tkinter 彈出視窗讓使用者選擇【多個】檔案。
    """
    print(f"請選擇 {title}...")
    try:
        root = Tk()
        root.withdraw()  # 隱藏主視窗
        # 使用 askopenfilenames (有 's')
        file_paths = filedialog.askopenfilenames(title=title, filetypes=filetypes)
        root.destroy()
    except tk.TclError:
        print("\n[錯誤] 偵測到 Tkinter (GUI) 環境問題。")
        print("您可能正在沒有圖形介面的環境 (例如 SSH) 中執行。")
        print("程式即將退出。")
        sys.exit()
    
    # askopenfilenames 回傳的是一個元組 (tuple)
    if not file_paths:
        print("未選擇檔案。程式即將退出。")
        sys.exit()
        
    print(f"已選擇 {len(file_paths)} 個檔案:")
    for path in file_paths:
        print(f"  - {os.path.basename(path)}")
    return file_paths
# --- 函式結束 ---

def load_ground_truth(json_path, json_title_key):
    """
    從 JSON 檔案中載入 "內文"。
    此版本會搜尋 "New Words" 列表。
    【已修改】: 發生錯誤時回傳 None，而不是 sys.exit()
    """
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 1. 檢查 JSON 結構
        if "New Words" not in data or not isinstance(data["New Words"], list):
            print(f"錯誤：JSON 檔案 {json_path} 結構不符。")
            print("預期結構為： {'New Words': [ ... ]}")
            return None # <-- 修改點
        
        # 2. 在 "New Words" 列表中尋找匹配的 "標題"
        found_story = None
        for story in data["New Words"]:
            if "標題" in story and isinstance(story["標題"], str):
                if story["標題"].strip() == json_title_key:
                    found_story = story
                    break
        
        if found_story is None:
            print(f"錯誤：在 JSON 檔案中找不到 '標題' 為 '{json_title_key}' 的項目。")
            print("請檢查 TXT 檔名是否能對應到 JSON 中的一個 '標題'。")
            return None # <-- 修改點

        # 3. 檢查找到的項目中是否有 "內文"
        if "內文" not in found_story:
            print(f"錯誤：找到 '標題' 為 '{json_title_key}' 的項目，但其中找不到 '內文' 欄位。")
            return None # <-- 修改點
            
        # 4. 提取並清理內文
        text = found_story["內文"]
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    except Exception as e:
        print(f"讀取或解析 JSON 檔案時發生錯誤: {e}")
        return None # <-- 修改點

def parse_txt_file(txt_path):
    """
    解析 TXT 檔案，保留所有結構，並提取純文字。
    【已修正 re.PatternError 的版本】
    【已修改】: 發生錯誤時回傳 None, None，而不是 sys.exit()
    """
    
    # 這個 Regex 會"選擇性"地抓取三個部分：
    # 1. (\[source\])?   - [source] 標籤 (可選)
    # 2. (\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\])? - [timestamp] 標籤 (可選)
    # 3. (.*)                 - 該行的所有剩餘文字
    line_regex = re.compile(
        r'(\[source\])?'        # Group 1: Source
        r'\s*'
        r'(\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\])?' # Group 2: Timestamp
        r'\s*'
        r'(.*)'                  # Group 3: Text
    )
    
    parsed_lines = []
    original_lines = []
    
    try:
        with open(txt_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.rstrip() # 移除行尾換行
                original_lines.append(line)
                
                m = line_regex.match(line)
                if m:
                    parsed_lines.append({
                        'original_line': line,
                        'source': m.group(1) or '',
                        'timestamp': m.group(2) or '',
                        'text': m.group(3) or ''
                    })
                else:
                    # 如果行不匹配 (例如空行)，也保留它
                    parsed_lines.append({
                        'original_line': line,
                        'source': '',
                        'timestamp': '',
                        'text': ''
                    })
                    
        return parsed_lines, original_lines
    except Exception as e:
        print(f"讀取 TXT 檔案時發生錯誤: {e}")
        return None, None # <-- 修改點

def normalize_word(word):
    """
    用於比對的標準化函數，移除標點並轉小寫。
    """
    return word.lower().strip(".,?!\"'“”‘’")

def correct_transcript():
    """
    主執行函數
    【已修改】: 支援批次處理多個 TXT 檔案
    """
    # 1. 選擇【單個】 JSON 檔案
    json_path = select_file(
        title="1. 請選擇「正確的」JSON 內文檔案 (story.json)",
        filetypes=[("JSON files", "*.json")]
    )
    
    # 2. 選擇【多個】 TXT 檔案
    txt_paths = select_multiple_files(
        title="2. 請選擇「要被訂正的」TXT 轉錄檔案 (可多選)",
        filetypes=[("Text files", "*.txt")]
    )
    # txt_paths 是一個元組 (tuple)
    if not txt_paths:
        print("未選擇任何 TXT 檔案。程式即將退出。")
        sys.exit()


    # 3. --- 建立迴圈，為每個 TXT 檔案執行 S-A-R 流程 ---
    for txt_path in txt_paths:
        
        print(f"\n==========================================================")
        print(f"--- 正在處理檔案: {os.path.basename(txt_path)} ---")
        print(f"==========================================================")

        # 4. 從 TXT 檔名推導 JSON 的 "標題" Key
        base_name_with_ext = os.path.basename(txt_path)
        base_name_no_ext = os.path.splitext(base_name_with_ext)[0]
        
        if " Timestamp" in base_name_no_ext:
            json_title_key = base_name_no_ext.replace(" Timestamp", "").strip()
        else:
            json_title_key = base_name_no_ext.strip()
        
        print(f"正在使用 TXT 檔名推導出的 Key: '{json_title_key}'")
        print(f"將在 {json_path} 中搜尋 '標題' 為 '{json_title_key}' 的項目...")

        # 5. 載入與解析 (S - Segment)
        json_full_text = load_ground_truth(json_path, json_title_key)
        # 檢查 load_ground_truth 是否成功
        if json_full_text is None:
            print(f"-> 錯誤: 無法載入 '{json_title_key}' 的 JSON 內文。已跳過此檔案。")
            continue # 跳至迴圈中的下一個檔案
            
        parsed_lines, original_txt_lines = parse_txt_file(txt_path)
        # 檢查 parse_txt_file 是否成功
        if parsed_lines is None:
            print(f"-> 錯誤: 無法讀取 TXT 檔案 {txt_path}。已跳過此檔案。")
            continue # 跳至迴圈中的下一個檔案

        print("JSON 內文與 TXT 檔案載入成功。")

        # 6. 建立比對用的「字詞列表」
        stt_full_text = " ".join(line['text'] for line in parsed_lines if line['text'])
        stt_words = stt_full_text.split()
        stt_norm_words = [normalize_word(w) for w in stt_words]
        
        json_words = json_full_text.split()
        json_norm_words = [normalize_word(w) for w in json_words]

        print(f"TXT 總字詞數 (STT): {len(stt_words)}")
        print(f"JSON 總字詞數 (Ground Truth): {len(json_words)}")
        
        # 7. 核心對齊 (A - Align)
        matcher = difflib.SequenceMatcher(None, stt_norm_words, json_norm_words, autojunk=False)
        opcodes = matcher.get_opcodes()

        stt_to_json_word_map = {}
        
        for tag, i1, i2, j1, j2 in opcodes:
            stt_len = i2 - i1
            json_len = j2 - j1

            if tag == 'equal':
                for k in range(stt_len):
                    stt_index = i1 + k
                    json_index = j1 + k
                    stt_to_json_word_map[stt_index] = json_words[json_index]
                    
            if tag == 'replace':
                if stt_len == json_len:
                    for k in range(stt_len):
                        stt_index = i1 + k
                        json_index = j1 + k
                        stt_to_json_word_map[stt_index] = json_words[json_index]
                else:
                    print(f"  [警告] 偵測到 'replace' 區塊長度不匹配 (STT: {stt_len} vs JSON: {json_len}).")
                    print(f"    STT 內容: {' '.join(stt_norm_words[i1:i2])}")
                    print(f"   JSON 內容: {' '.join(json_norm_words[j1:j2])}")
                    print("    此區塊可能無法完美訂正，將暫時保留 STT 原文。")
                    for k in range(stt_len):
                        stt_index = i1 + k
                        if stt_index < len(stt_words):
                            stt_to_json_word_map[stt_index] = stt_words[stt_index]

            if tag == 'delete':
                 for k in range(stt_len):
                    stt_index = i1 + k
                    if stt_index < len(stt_words):
                        stt_to_json_word_map[stt_index] = stt_words[stt_index]

        # 8. 重建 (R - Rebuild)
        new_txt_lines = []
        stt_word_counter = 0
        
        for line in parsed_lines:
            if not line['text']:
                new_txt_lines.append(line['original_line'])
                continue
                
            words_on_this_line = line['text'].split()
            new_text_for_line = []
            
            for word in words_on_this_line:
                if stt_word_counter in stt_to_json_word_map:
                    new_text_for_line.append(stt_to_json_word_map[stt_word_counter])
                else:
                    new_text_for_line.append(word)
                    
                stt_word_counter += 1
                
            new_text = " ".join(new_text_for_line)
            
            parts = []
            if line['source']:
                parts.append(line['source'])
            if line['timestamp']:
                parts.append(line['timestamp'])
            if new_text:
                parts.append(new_text)
                
            new_line = " ".join(parts)
            new_txt_lines.append(new_line)

        # 9. 寫入檔案並回報 (仍在迴圈內)
        try:
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write("\n".join(new_txt_lines))
            
            print(f"\n--- 成功 ---")
            print(f"檔案已訂正並覆蓋: {txt_path}")

            # 10. 顯示 Diff 報告 (使用 colorama 進行逐字高亮)
            
            print("\n--- 訂正報告 (逐字高亮 Diff) ---")
            print(f"({Fore.RED}--- 原始 TXT{Style.RESET_ALL} | {Fore.GREEN}+++ 訂正後 TXT{Style.RESET_ALL})")
            print(" (未變更的字 = 預設顏色 | 變更的字 = 高亮顯示)")

            found_changes = False
            
            # 使用 zip 逐行比較
            for orig_line, new_line in zip(original_txt_lines, new_txt_lines):
                # 只有當行真的不同時才進行處理
                if orig_line != new_line:
                    found_changes = True
                    
                    # 我們用 split() 來比較 "字詞"，這包含 [timestamp] 標籤
                    # 這樣標籤會被視為 "equal" 的字，不會被上色
                    orig_words = orig_line.split()
                    new_words = new_line.split()
                    
                    # 對 "這一行" 的字詞列表進行 SequenceMatcher
                    matcher = difflib.SequenceMatcher(None, orig_words, new_words)
                    opcodes = matcher.get_opcodes()
                    
                    # --- 輸出 "舊行" (---) ---
                    print(f"\n{Fore.RED}- ", end="") # - 號 (紅色)
                    for tag, i1, i2, j1, j2 in opcodes:
                        words = " ".join(orig_words[i1:i2])
                        if tag == 'equal':
                            print(words, end=" ")
                        if tag == 'replace' or tag == 'delete':
                            # 高亮 (亮紅色) 顯示被刪除或替換的字
                            print(f"{Style.BRIGHT}{Fore.RED}{words}{Style.RESET_ALL}", end=" ")
                    print() # 換行

                    # --- 輸出 "新行" (+++) ---
                    print(f"{Fore.GREEN}+ ", end="") # + 號 (綠色)
                    for tag, i1, i2, j1, j2 in opcodes:
                        words = " ".join(new_words[j1:j2])
                        if tag == 'equal':
                            print(words, end=" ")
                        if tag == 'replace' or tag == 'insert':
                            # 高亮 (亮綠色) 顯示新增或替換的字
                            print(f"{Style.BRIGHT}{Fore.GREEN}{words}{Style.RESET_ALL}", end=" ")
                    print() # 換行
                    
            if not found_changes:
                print("\n...檔案內容完全一致，沒有偵測到任何修改。...")

        except Exception as e:
            print(f"寫入檔案 {txt_path} 時發生錯誤: {e}")
            print("-> 已跳過此檔案的寫入/報告步驟。")
            continue # 出錯時，繼續處理下一個檔案
    
    # --- 迴圈結束 ---
    print(f"\n==========================================================")
    print(f"--- 所有 {len(txt_paths)} 個檔案均已處理完畢 ---")
    print(f"==========================================================")


# --- 執行主程式 ---
if __name__ == "__main__":
    correct_transcript()