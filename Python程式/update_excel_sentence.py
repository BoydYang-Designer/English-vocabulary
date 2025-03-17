import pandas as pd
import openpyxl
import re

def extract_eg_sentences(text):
    """從 'English meaning' 欄位中提取以 'E.g.' 開頭的句子"""
    if pd.isna(text):
        return []
    sentences = re.findall(r'E\.g\.\s*(.*?)\.', text)
    return [s.strip() for s in sentences]

def get_max_suffix(word, df_b):
    """獲取 Excel B 中該單字的最大編號"""
    pattern = rf'^{word}-(\d+)$'
    suffixes = df_b['Words'].str.extract(pattern).dropna().astype(int)
    return suffixes.max().item() if not suffixes.empty else 0

def update_excel_b(excel_a_path, excel_b_path, output_path):
    """將 Excel A 的新例句更新到 Excel B，並更新現有記錄的分類和等級"""
    # 讀取 Excel A 和 Excel B
    df_a = pd.read_excel(excel_a_path)
    df_b = pd.read_excel(excel_b_path)
    
    # 載入 Excel B 的工作簿以保留格式
    wb = openpyxl.load_workbook(excel_b_path)
    ws = wb.active
    
    # 儲存新條目
    new_rows = []
    updated_cells = 0  # 記錄更新的單元格數量
    
    for index, row in df_a.iterrows():
        word = row['Words']
        eg_sentences = extract_eg_sentences(row['English meaning'])
        category_a = row['分類'] if pd.notna(row['分類']) else ''
        level_a = row['等級'] if pd.notna(row['等級']) else ''
        
        # 獲取 Excel B 中該單字的記錄
        word_records = df_b[df_b['Words'].str.startswith(word + '-')]
        max_suffix = get_max_suffix(word, df_b)
        existing_sentences = set(word_records['句子'].dropna().str.strip())
        
        # 更新現有記錄的分類和等級
        for b_index, b_row in word_records.iterrows():
            b_row_idx = b_index + 2  # Excel 行號從 1 開始，且有標題行
            update_needed = False
            
            # 檢查分類
            current_category = b_row['分類'] if pd.notna(b_row['分類']) else ''
            if not current_category and category_a:
                ws.cell(row=b_row_idx, column=3, value=category_a)  # 分類在第3列
                update_needed = True
            
            # 檢查等級
            current_level = b_row['等級'] if pd.notna(b_row['等級']) else ''
            if not current_level and level_a:
                ws.cell(row=b_row_idx, column=2, value=level_a)  # 等級在第2列
                update_needed = True
            
            if update_needed:
                updated_cells += 1
        
        # 處理新例句
        if eg_sentences:
            for sentence in eg_sentences:
                if sentence not in existing_sentences:
                    max_suffix += 1
                    new_word = f"{word}-{max_suffix}"
                    new_row = {
                        '音檔': '',
                        '等級': level_a,
                        '分類': category_a,
                        'Words': new_word,
                        '名人': '',
                        '句子': sentence,
                        '中文': ''
                    }
                    new_rows.append(new_row)
                    existing_sentences.add(sentence)
    
    # 追加新條目
    if new_rows:
        for row in pd.DataFrame(new_rows).itertuples(index=False):
            ws.append(row)
    
    # 保存更新後的 Excel B
    wb.save(output_path)
    if new_rows or updated_cells:
        print(f"已更新 {len(new_rows)} 條新記錄和 {updated_cells} 個現有記錄的分類/等級到 {output_path}")
    else:
        print("沒有新記錄或更新需要保存")

# 使用示例
excel_a_path = 'Z_total_words.xlsx'
excel_b_path = 'sentence.xlsx'
output_path = 'updated_sentence.xlsx'
update_excel_b(excel_a_path, excel_b_path, output_path)