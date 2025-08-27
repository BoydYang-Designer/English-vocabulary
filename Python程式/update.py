import pandas as pd
import openpyxl
import re
import json
import os
import sys

def extract_eg_sentences(text):
    """從 'English meaning' 欄位中提取以 'E.g.' 開頭的句子，處理空格數量誤植"""
    if pd.isna(text):
        return []
    sentences = re.findall(r'E\.g\.\s*(.*?)(?:\.\s*$|\.\s+|\n|$)', text, re.MULTILINE)
    cleaned_sentences = [s.strip() for s in sentences if s.strip()]
    print(f"提取的例句: {cleaned_sentences}")
    return cleaned_sentences

def get_max_suffix(word, df_b):
    """獲取 Excel B 中該單字的最大編號"""
    pattern = rf'^{re.escape(word)}-(\d+)$'
    suffixes = df_b['Words'].str.extract(pattern).dropna()
    if suffixes.empty:
        return 0
    try:
        suffixes = suffixes.astype(int)
        return int(suffixes.max().item())
    except Exception as e:
        print(f"處理單字 {word} 的編號時發生錯誤: {e}")
        print(f"問題數據: {suffixes}")
        raise

def preprocess_sentence(sentence):
    """預處理句子：去除標點符號並轉換為小寫"""
    sentence = re.sub(r'[^\w\s]', '', sentence)
    return sentence.lower().strip()

def update_excel_b(excel_a_path, excel_b_path, output_path):
    """將 Excel A 的新例句更新到 Excel B，並更新現有記錄的分類和等級"""
    if not os.path.exists(excel_a_path):
        raise FileNotFoundError(f"找不到 Excel A 檔案: {excel_a_path}")
    if not os.path.exists(excel_b_path):
        raise FileNotFoundError(f"找不到 Excel B 檔案: {excel_b_path}")
    
    # 獲取原始檔案大小
    input_size = os.path.getsize(excel_b_path) / 1024  # 單位：KB
    print(f"Excel B 原始檔案大小: {input_size:.2f} KB")
    
    df_a = pd.read_excel(excel_a_path)
    df_b = pd.read_excel(excel_b_path)
    
    print(f"Excel A 行數: {len(df_a)}")
    print(f"Excel B 原始行數: {len(df_b)}")
    
    wb = openpyxl.load_workbook(excel_b_path)
    ws = wb.active
    
    new_rows = []
    
    for index, row in df_a.iterrows():
        word = row['Words']
        if pd.isna(word) or not isinstance(word, str):
            print(f"跳過無效單字: {word}")
            continue
        
        eg_sentences = extract_eg_sentences(row['English meaning'])

        # 🔹 支援多分類
        categories = []
        for c in ['分類1', '分類2', '分類3']:
            if c in row and pd.notna(row[c]):
                categories.append(str(row[c]).strip())
        category1 = categories[0] if len(categories) > 0 else ''
        category2 = categories[1] if len(categories) > 1 else ''
        category3 = categories[2] if len(categories) > 2 else ''

        level_a = row['等級'] if pd.notna(row['等級']) else ''
        
        print(f"處理單字: {word}, 分類: {categories}, 等級: {level_a}")
        
        word_records = df_b[df_b['Words'].notna() & df_b['Words'].str.match(rf'^{re.escape(word)}-\d+$')]
        max_suffix = get_max_suffix(word, df_b)
        
        existing_sentences = set(preprocess_sentence(s) for s in word_records['句子'].dropna())
        
        for b_index, b_row in word_records.iterrows():
            b_row_idx = b_index + 2
            update_needed = False
            
            # 更新分類
            if category1 or category2 or category3:
                ws.cell(row=b_row_idx, column=3, value=category1)
                ws.cell(row=b_row_idx, column=4, value=category2)
                ws.cell(row=b_row_idx, column=5, value=category3)
                update_needed = True
            
            current_level = b_row['等級'] if pd.notna(b_row['等級']) else ''
            if not current_level and level_a:
                ws.cell(row=b_row_idx, column=2, value=level_a)
                update_needed = True
                
            if update_needed:
                print(f"更新行 {b_row_idx}: Words={b_row['Words']}, 分類=({category1},{category2},{category3}), 等級={level_a}")
        
        if eg_sentences:
            for sentence in eg_sentences:
                preprocessed_sentence = preprocess_sentence(sentence)
                if preprocessed_sentence not in existing_sentences:
                    max_suffix += 1
                    new_word = f"{word}-{max_suffix}"
                    new_row = {
                        '音檔': '',
                        '等級': level_a,
                        '分類1': category1,
                        '分類2': category2,
                        '分類3': category3,
                        'Words': new_word,
                        '名人': '',
                        '句子': sentence,
                        '中文': ''
                    }
                    new_rows.append(new_row)
                    existing_sentences.add(preprocessed_sentence)
                    print(f"添加新例句: {new_word}, 句子={sentence}")
    
    if new_rows:
        for row in pd.DataFrame(new_rows).itertuples(index=False):
            ws.append(row)
    
    print(f"新增行數: {len(new_rows)}")
    
    wb.save(output_path)
    
    df_output = pd.read_excel(output_path)
    output_size = os.path.getsize(output_path) / 1024  # 單位：KB
    print(f"Excel B 輸出行數: {len(df_output)}")
    print(f"Excel B 輸出檔案大小: {output_size:.2f} KB")
    
    if len(df_output) < len(df_b):
        print("警告：輸出行數少於原始行數，可能有數據丟失！")
    
    print(f"已更新 Excel B，結果保存到 {output_path}")
    return True

def compare_excel_files(excel_a_path, excel_b_path, output_json_path):
    """比對兩個 Excel 檔案的指定欄位（不含音檔），並在有差異時記錄到 JSON 檔案"""
    columns_to_compare = ['等級', '分類1', '分類2', '分類3', 'Words', '名人', '句子', '中文']
    
    if not os.path.exists(excel_a_path):
        raise FileNotFoundError(f"找不到 Excel A 檔案: {excel_a_path}")
    if not os.path.exists(excel_b_path):
        raise FileNotFoundError(f"找不到 Excel B 檔案: {excel_b_path}")
    
    df_a = pd.read_excel(excel_a_path)
    df_b = pd.read_excel(excel_b_path)
    
    for col in columns_to_compare:
        if col not in df_a.columns:
            df_a[col] = ''
        if col not in df_b.columns:
            df_b[col] = ''
    
    df_a = df_a.fillna('')
    df_b = df_b.fillna('')
    
    a_dict = {row['Words']: row.to_dict() for _, row in df_a.iterrows()}
    b_dict = {row['Words']: row.to_dict() for _, row in df_b.iterrows()}
    
    differences = []
    
    common_words = set(a_dict.keys()) & set(b_dict.keys())
    for word in common_words:
        a_row = a_dict[word]
        b_row = b_dict[word]
        diff = {}
        
        for col in columns_to_compare:
            if col != 'Words':
                a_val = a_row[col]
                b_val = b_row[col]
                if a_val != b_val:
                    diff[col] = {'A 值': a_val, 'B 值': b_val}
        
        if diff:
            differences.append({
                'Words': word,
                '狀態': 'A 和 B 均有，但內容有差異',
                '差異內容': diff
            })
    
    a_only_words = set(a_dict.keys()) - set(b_dict.keys())
    for word in a_only_words:
        differences.append({
            'Words': word,
            '狀態': 'A 有，B 無',
            'A 內容': {k: v for k, v in a_dict[word].items() if k in columns_to_compare}
        })
    
    b_only_words = set(b_dict.keys()) - set(a_dict.keys())
    for word in b_only_words:
        differences.append({
            'Words': word,
            '狀態': 'B 有，A 無',
            'B 內容': {k: v for k, v in b_dict[word].items() if k in columns_to_compare}
        })
    
    if differences:
        with open(output_json_path, 'w', encoding='utf-8') as json_file:
            json.dump(differences, json_file, ensure_ascii=False, indent=4)
        print(f"比對完成，差異已記錄到 {output_json_path}")
    else:
        print("A 和 B 之間沒有差異，未生成 JSON 檔案")

def main():
    """主函數，先更新 Excel B，然後比對 sentence.xlsx 和 updated_sentence.xlsx"""
    excel_a_path = 'Z_total_words.xlsx'
    excel_b_path = 'sentence.xlsx'
    output_path = 'updated_sentence.xlsx'
    output_json_path = 'comparison_result.json'
    
    try:
        df_b = pd.read_excel(excel_b_path)
        # 允許字母、數字、連字符、空格、撇號和重音符號
        invalid_words = df_b[df_b['Words'].notna() & ~df_b['Words'].str.match(r'^[\w\s\'’éèêëáàâãäåíìîïóòôõöúùûüýÿ-]+-\d+$', na=False)]
        if not invalid_words.empty:
            print("發現無效的 Words 欄位值：")
            print(invalid_words[['Words']])
            return
    except Exception as e:
        print(f"讀取 Excel B 時發生錯誤: {e}")
        return
    
    try:
        update_excel_b(excel_a_path, excel_b_path, output_path)
        compare_excel_files(excel_b_path, output_path, output_json_path)
    except FileNotFoundError as e:
        print(f"錯誤: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"發生未知錯誤: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
