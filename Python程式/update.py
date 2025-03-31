import pandas as pd
import openpyxl
import re
import json
import os

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

def preprocess_sentence(sentence):
    """預處理句子：去除標點符號並轉換為小寫"""
    sentence = re.sub(r'[^\w\s]', '', sentence)  # 去除標點符號
    return sentence.lower().strip()  # 轉換為小寫並去除多餘空白

def update_excel_b(excel_a_path, excel_b_path, output_path):
    """將 Excel A 的新例句更新到 Excel B，並更新現有記錄的分類和等級"""
    # 檢查檔案是否存在
    if not os.path.exists(excel_a_path):
        raise FileNotFoundError(f"找不到 Excel A 檔案: {excel_a_path}")
    if not os.path.exists(excel_b_path):
        raise FileNotFoundError(f"找不到 Excel B 檔案: {excel_b_path}")
    
    # 讀取 Excel A 和 Excel B
    df_a = pd.read_excel(excel_a_path)
    df_b = pd.read_excel(excel_b_path)
    
    # 載入 Excel B 的工作簿以保留格式
    wb = openpyxl.load_workbook(excel_b_path)
    ws = wb.active
    
    # 儲存新條目
    new_rows = []
    
    for index, row in df_a.iterrows():
        word = row['Words']
        eg_sentences = extract_eg_sentences(row['English meaning'])
        category_a = row['分類'] if pd.notna(row['分類']) else ''
        level_a = row['等級'] if pd.notna(row['等級']) else ''
        
        # 過濾掉 Words 欄位中的 NaN 值後再檢查單字
        word_records = df_b[df_b['Words'].notna() & df_b['Words'].str.startswith(word + '-')]
        max_suffix = get_max_suffix(word, df_b)
        
        # 預處理現有句子並存為集合
        existing_sentences = set(preprocess_sentence(s) for s in word_records['句子'].dropna())
        
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
        
        # 處理新例句
        if eg_sentences:
            for sentence in eg_sentences:
                preprocessed_sentence = preprocess_sentence(sentence)
                if preprocessed_sentence not in existing_sentences:
                    max_suffix += 1
                    new_word = f"{word}-{max_suffix}"
                    new_row = {
                        '音檔': '',
                        '等級': level_a,
                        '分類': category_a,
                        'Words': new_word,
                        '名人': '',
                        '句子': sentence,  # 保留原始句子
                        '中文': ''
                    }
                    new_rows.append(new_row)
                    existing_sentences.add(preprocessed_sentence)
    
    # 追加新條目到 Excel
    if new_rows:
        for row in pd.DataFrame(new_rows).itertuples(index=False):
            ws.append(row)
    
    # 保存更新後的 Excel 文件
    wb.save(output_path)
    
    print(f"已更新 Excel B，結果保存到 {output_path}")
    return True  # 表示更新成功

def compare_excel_files(excel_a_path, excel_b_path, output_json_path):
    """比對兩個 Excel 檔案的指定欄位（不含音檔），並在有差異時記錄到 JSON 檔案"""
    # 定義要比對的欄位（移除 '音檔'）
    columns_to_compare = ['等級', '分類', 'Words', '名人', '句子', '中文']
    
    # 檢查檔案是否存在
    if not os.path.exists(excel_a_path):
        raise FileNotFoundError(f"找不到 Excel A 檔案: {excel_a_path}")
    if not os.path.exists(excel_b_path):
        raise FileNotFoundError(f"找不到 Excel B 檔案: {excel_b_path}")
    
    # 讀取 Excel 檔案
    df_a = pd.read_excel(excel_a_path)
    df_b = pd.read_excel(excel_b_path)
    
    # 確保所有要比對的欄位都存在
    for col in columns_to_compare:
        if col not in df_a.columns:
            df_a[col] = ''
        if col not in df_b.columns:
            df_b[col] = ''
    
    # 將 NaN 值轉換為空字串
    df_a = df_a.fillna('')
    df_b = df_b.fillna('')
    
    # 以 'Words' 欄位作為主鍵，轉為字典方便比對
    a_dict = {row['Words']: row.to_dict() for _, row in df_a.iterrows()}
    b_dict = {row['Words']: row.to_dict() for _, row in df_b.iterrows()}
    
    # 儲存差異的結果
    differences = []
    
    # 比對 A 和 B 共有的 Words
    common_words = set(a_dict.keys()) & set(b_dict.keys())
    for word in common_words:
        a_row = a_dict[word]
        b_row = b_dict[word]
        diff = {}
        
        # 逐一比對其他欄位（不含 '音檔'）
        for col in columns_to_compare:
            if col != 'Words':  # 跳過 'Words' 本身
                a_val = a_row[col]
                b_val = b_row[col]
                if a_val != b_val:
                    diff[col] = {'A 值': a_val, 'B 值': b_val}
        
        # 如果有差異，記錄下來
        if diff:
            differences.append({
                'Words': word,
                '狀態': 'A 和 B 均有，但內容有差異',
                '差異內容': diff
            })
    
    # 檢查 A 有但 B 沒有的 Words
    a_only_words = set(a_dict.keys()) - set(b_dict.keys())
    for word in a_only_words:
        differences.append({
            'Words': word,
            '狀態': 'A 有，B 無',
            'A 內容': {k: v for k, v in a_dict[word].items() if k in columns_to_compare}
        })
    
    # 檢查 B 有但 A 沒有的 Words
    b_only_words = set(b_dict.keys()) - set(a_dict.keys())
    for word in b_only_words:
        differences.append({
            'Words': word,
            '狀態': 'B 有，A 無',
            'B 內容': {k: v for k, v in b_dict[word].items() if k in columns_to_compare}
        })
    
    # 如果有差異，生成 JSON 檔案；如果沒有差異，不生成檔案
    if differences:
        with open(output_json_path, 'w', encoding='utf-8') as json_file:
            json.dump(differences, json_file, ensure_ascii=False, indent=4)
        print(f"比對完成，差異已記錄到 {output_json_path}")
    else:
        print("A 和 B 之間沒有差異，未生成 JSON 檔案")

def main():
    """主函數，先更新 Excel B，然後比對 sentence.xlsx 和 updated_sentence.xlsx"""
    # 設定固定的檔案路徑（相對於當前工作目錄）
    excel_a_path = 'Z_total_words.xlsx'  # 用於更新的 Excel A
    excel_b_path = 'sentence.xlsx'       # 原始 Excel B
    output_path = 'updated_sentence.xlsx'  # 更新後的 Excel B
    output_json_path = 'comparison_result.json'  # 比對結果 JSON
    
    try:
        # 先執行更新
        update_excel_b(excel_a_path, excel_b_path, output_path)
        
        # 更新完成後，自動比對 sentence.xlsx 和 updated_sentence.xlsx
        compare_excel_files(excel_b_path, output_path, output_json_path)
    except FileNotFoundError as e:
        print(f"錯誤: {e}")
    except Exception as e:
        print(f"發生未知錯誤: {e}")

if __name__ == "__main__":
    main()