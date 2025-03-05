import pandas as pd
import os

def update_excel_b(excel_a_path, excel_b_path, max_suffix=3):
    # 讀取 Excel A 和 Excel B，去除欄位名稱的前後空格
    df_a = pd.read_excel(excel_a_path, dtype=str).rename(columns=lambda x: x.strip())
    df_b = pd.read_excel(excel_b_path, dtype=str).rename(columns=lambda x: x.strip())

    # 確保 Excel A 和 Excel B 都包含必要欄位
    required_columns = ['Words', '等級', '分類']
    for col in required_columns:
        if col not in df_a.columns:
            raise ValueError(f"Excel A 缺少必要欄位: {col}")
        if col not in df_b.columns:
            raise ValueError(f"Excel B 缺少必要欄位: {col}")

    # 取得 Excel B 所有原始欄位（避免影響「音檔」等欄位）
    all_columns = df_b.columns.tolist()

    # 去除 Words 欄位中的重複值，避免索引錯誤
    word_info = df_a[['Words', '等級', '分類']].drop_duplicates(subset=['Words']).set_index('Words').to_dict(orient='index')

    # 生成 Excel B 中的單字後綴數量
    word_suffix_count = {}
    for word in df_b['Words']:
        base_word = word.rstrip('-1234567890')  # 獲取基礎單字
        if base_word in word_info:
            word_suffix_count[base_word] = word_suffix_count.get(base_word, 0) + 1

    # **步驟 1：更新 Excel B 已有的單字**
    for index, row in df_b.iterrows():
        base_word = row['Words'].rstrip('-1234567890')  # 獲取基礎單字
        if base_word in word_info:
            # 只更新「等級」與「分類」，不影響其他欄位
            df_b.at[index, '等級'] = word_info[base_word]['等級']
            df_b.at[index, '分類'] = word_info[base_word]['分類']

    # **步驟 2：新增 Excel B 中尚未存在的單字**
    new_rows = []
    for word, info in word_info.items():
        existing_count = word_suffix_count.get(word, 0)
        for i in range(existing_count + 1, max_suffix + 1):
            # 檢查是否已有相同單字，並保留其他欄位資料
            matching_row = df_b[df_b['Words'] == f"{word}-{i-1}"]
            new_row = {col: matching_row[col].values[0] if not matching_row.empty else "" for col in all_columns}  # 保留原來的資料
            new_row['Words'] = f"{word}-{i}"
            new_row['等級'] = info['等級']
            new_row['分類'] = info['分類']

            # 如果存在音檔欄位，確保保留音檔資料（不覆蓋公式）
            if '音檔' in df_b.columns:
                if not matching_row.empty:
                    # 檢查音檔欄位是否為公式
                    audio_formula = matching_row['音檔'].values[0]
                    if isinstance(audio_formula, str) and audio_formula.startswith('='):
                        new_row['音檔'] = audio_formula  # 保留原來的公式
                    else:
                        new_row['音檔'] = ""  # 如果是空值或非公式，設置為空
                else:
                    new_row['音檔'] = ""  # 若無對應的行，設置為空

            new_rows.append(new_row)
            if i == max_suffix:
                break

    # 轉換新增的資料為 DataFrame
    df_new = pd.DataFrame(new_rows)

    # 合併新舊資料
    df_b = pd.concat([df_b, df_new], ignore_index=True)

    # **步驟 3：直接覆蓋 Excel B**
    df_b.to_excel(excel_b_path, index=False)
    print(f"更新完成，已覆蓋原檔案: {excel_b_path}")

# 設定檔案路徑
excel_a_path = "C:\\conver file\\Z_total_words.xlsx"
excel_b_path = "C:\\conver file\\sentence.xlsx"

# 呼叫更新函式
update_excel_b(excel_a_path, excel_b_path)
