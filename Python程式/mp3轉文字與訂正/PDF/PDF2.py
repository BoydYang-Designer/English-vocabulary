import fitz  # PyMuPDF
import difflib
import tkinter as tk
from tkinter import filedialog, messagebox
import os
import re
import string

def select_files(title, file_types, multiple=False):
    root = tk.Tk()
    root.withdraw()
    if multiple:
        file_paths = filedialog.askopenfilenames(title=title, filetypes=file_types)
    else:
        file_paths = filedialog.askopenfilename(title=title, filetypes=file_types)
    root.destroy()
    return file_paths

def extract_clean_words_from_pdf(pdf_path):
    """提取 PDF 文字並徹底移除單字前後的標點符號"""
    try:
        doc = fitz.open(pdf_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text("text") + " "
        
        raw_words = full_text.split()
        # 移除每個單字前後的標點符號，只保留中間的文字/數字
        clean_words = [w.strip(string.punctuation) for w in raw_words if w.strip(string.punctuation)]
        return clean_words
    except Exception as e:
        raise Exception(f"讀取 PDF 失敗: {e}")

def is_typo(w1, w2):
    """判定是否為拼寫錯誤（排除標點干擾）"""
    # 移除標點後再比對
    s1 = w1.strip(string.punctuation)
    s2 = w2.strip(string.punctuation)
    
    if not s1 or not s2 or s1 == s2:
        return False
    
    similarity = difflib.SequenceMatcher(None, s1, s2).ratio()
    # 門檻設為 0.7，且長度差不超過 3
    return similarity >= 0.7 and abs(len(s1) - len(s2)) <= 3

def process_single_file(txt_path, pdf_words):
    with open(txt_path, 'r', encoding='utf-8') as f:
        original_content = f.read()

    # 正則表達式：\w+ 抓取單字，\W+ 抓取所有非單字（包含標點、空格、換行）
    tokens = re.split(r'(\W+)', original_content)
    
    word_tokens = []
    word_indices = []
    for i, token in enumerate(tokens):
        # 只有純文字部分才進入比對清單
        if token and re.match(r'\w+', token):
            word_tokens.append(token)
            word_indices.append(i)

    # 1. 模糊定位區間
    matcher = difflib.SequenceMatcher(None, word_tokens, pdf_words)
    match = matcher.find_longest_match(0, len(word_tokens), 0, len(pdf_words))
    
    start_idx = max(0, match.b - 50)
    end_idx = min(len(pdf_words), match.b + len(word_tokens) + 50)
    pdf_segment = pdf_words[start_idx:end_idx]

    # 2. 逐字比對
    s = difflib.SequenceMatcher(None, word_tokens, pdf_segment)
    file_logs = []
    
    for tag, i1, i2, j1, j2 in s.get_opcodes():
        if tag == 'replace':
            txt_slice = word_tokens[i1:i2]
            pdf_slice = pdf_segment[j1:j2]
            
            if len(txt_slice) == len(pdf_slice):
                for idx_in_slice, (o, p) in enumerate(zip(txt_slice, pdf_slice)):
                    # 去掉標點後進行相似度判斷
                    clean_p = p.strip(string.punctuation)
                    if is_typo(o, clean_p):
                        original_token_idx = word_indices[i1 + idx_in_slice]
                        # 只替換單字部分，標點符號保留在 tokens 的其他位置
                        tokens[original_token_idx] = clean_p
                        file_logs.append(f"  - [拼錯修正]: {o} -> {clean_p}")

    final_content = "".join(tokens)
    return final_content, file_logs

def main():
    txt_files = select_files("選取要修改的文字檔 (可複選)", [("Text files", "*.txt")], multiple=True)
    if not txt_files: return

    pdf_file = select_files("選取參考 PDF", [("PDF files", "*.pdf")], multiple=False)
    if not pdf_file: return

    try:
        print("正在解析 PDF 並清理標點符號...")
        pdf_words = extract_clean_words_from_pdf(pdf_file)

        total_logs = []
        success_count = 0

        for txt_path in txt_files:
            file_name = os.path.basename(txt_path)
            print(f"處理中: {file_name}")
            
            new_content, logs = process_single_file(txt_path, pdf_words)
            
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            
            if logs:
                total_logs.append(f"【檔案: {file_name}】")
                total_logs.extend(logs)
                total_logs.append("")
            success_count += 1

        log_path = os.path.join(os.path.dirname(txt_files[0]), "revision_log.txt")
        with open(log_path, "w", encoding="utf-8") as f:
            f.write(f"修正報告 (標點符號已受保護)\n參考: {os.path.basename(pdf_file)}\n{'='*30}\n")
            f.write("\n".join(total_logs) if total_logs else "未發現符合門檻的拼寫錯誤。")

        messagebox.showinfo("完成", f"已處理 {success_count} 個檔案！\n標點符號已保持不變。")

    except Exception as e:
        messagebox.showerror("錯誤", str(e))

if __name__ == "__main__":
    main()