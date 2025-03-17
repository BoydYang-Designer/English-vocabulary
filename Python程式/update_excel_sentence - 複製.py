import pandas as pd
import openpyxl
import re

def extract_eg_sentences(text):
    """從 'English meaning' 欄位中提取以 'E.g.' 開頭的句子"""
    if pd.isna(text):  # 檢查是否為空值
        return []
    # 使用正則表達式提取 E.g. 後的句子，直到句點結束
    sentences = re.findall(r'E\.g\.\s*(.*?)\.', text)
    return [s.strip() for s in sentences]  # 去除多餘空白

def get_max_suffix(word, df_b):
    """獲取 Excel B 中該單字的最大編號"""
    pattern = rf'^{word}-(\d+)$'  # 匹配如 'absorb-1' 的編號
    suffixes = df_b['Words'].str.extract(pattern).dropna().astype(int)
    if suffixes.empty:  # 如果沒有編號，從 0 開始
        return 0
    return suffixes.max().item()  # 返回最大編號

def update_excel_b(excel_a_path, excel_b_path, output_path):
    """將 Excel A 的新例句更新到 Excel B"""
    # 讀取 Excel A 和 Excel B
    df_a = pd.read_excel(excel_a_path)
    df_b = pd.read_excel(excel_b_path)
    
    # 載入 Excel B 的工作簿以保留格式
    wb = openpyxl.load_workbook(excel_b_path)
    ws = wb.active
    
    # 儲存新條目
    new_rows = []
    for index, row in df_a.iterrows():
        word = row['Words']  # 單字
        eg_sentences = extract_eg_sentences(row['English meaning'])  # 提取 E.g. 句子
        if not eg_sentences:
            continue  # 如果沒有 E.g. 句子，跳過
        
        # 獲取 Excel B 中該單字的最大編號
        max_suffix = get_max_suffix(word, df_b)
        
        # 獲取 Excel B 中已有的句子（去除空白並轉為集合）
        existing_sentences = set(df_b[df_b['Words'].str.startswith(word)]['句子'].dropna().str.strip())
        
        # 檢查並準備新條目
        for sentence in eg_sentences:
            if sentence not in existing_sentences:  # 如果句子不存在
                max_suffix += 1  # 編號遞增
                new_word = f"{word}-{max_suffix}"  # 新編號格式，如 'absorb-10'
                new_row = {
                    '音檔': '',  # 音檔欄位留空
                    '等級': row['等級'],
                    '分類': row['分類'],
                    'Words': new_word,
                    '名人': '',
                    '句子': sentence,
                    '中文': ''
                }
                new_rows.append(new_row)
                # 將新句子加入已存在集合，避免重複
                existing_sentences.add(sentence)
    
    # 如果有新條目，追加到 Excel B
    if new_rows:
        new_df = pd.DataFrame(new_rows)
        # 將新數據追加到工作表
        for row in new_df.itertuples(index=False):
            ws.append(row)
        
        # 保存更新後的 Excel B
        wb.save(output_path)
        print(f"已更新 {len(new_rows)} 條新記錄到 {output_path}")
    else:
        print("沒有新記錄需要更新")

# 使用示例
excel_a_path = 'Z_total_words.xlsx'  # Excel A 檔案路徑
excel_b_path = 'sentence.xlsx'       # Excel B 檔案路徑
output_path = 'updated_sentence.xlsx' # 更新後的輸出路徑
update_excel_b(excel_a_path, excel_b_path, output_path)