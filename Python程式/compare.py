import pandas as pd
import json
import os

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
    """主函數，直接比對當前路徑下的 sentence.xlsx 和 updated_sentence.xlsx"""
    # 設定固定的檔案路徑（相對於當前工作目錄）
    excel_a_path = 'sentence.xlsx'  # Excel A 為 sentence.xlsx
    excel_b_path = 'updated_sentence.xlsx'  # Excel B 為 updated_sentence.xlsx
    output_json_path = 'comparison_result.json'  # 輸出 JSON 檔案名稱
    
    try:
        compare_excel_files(excel_a_path, excel_b_path, output_json_path)
    except FileNotFoundError as e:
        print(f"錯誤: {e}")
    except Exception as e:
        print(f"發生未知錯誤: {e}")

if __name__ == "__main__":
    main()