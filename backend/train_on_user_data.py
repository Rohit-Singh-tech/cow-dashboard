import os
import sys
import io
import math
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, accuracy_score

# Ensure backend app imports work
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.ml_service import extract_window_features, CowHealthMLPipeline, MODEL_FILE_PATH

LABEL_MAP = {
    'DRN': 'Drinking',
    'FEP': 'Grazing',
    'FES': 'Grazing',
    'FED': 'Grazing',
    'GRZ': 'Grazing',
    'WAL': 'Walking',
    'MOV': 'Walking',
    'BMN': 'Walking',
    'STD': 'Standing',
    'ATT': 'Standing',
    'ETC': 'Standing',
    'URI': 'Standing',
    'DEF': 'Standing',
    'LYG': 'Lying',
    'REL': 'Lying',
    'RES': 'Resting',
    'RUN': 'Running',
    'RUM': 'Ruminating',
    'RUS': 'Ruminating',
    'LCK': 'Resting',
    'SLT': 'Resting',
    'drn': 'Drinking',
    'fep': 'Grazing',
    'wal': 'Walking',
    'std': 'Standing',
    'lyg': 'Lying',
    'res': 'Resting',
    'run': 'Running',
    'rum': 'Ruminating',
    'Drinking': 'Drinking',
    'Grazing': 'Grazing',
    'Walking': 'Walking',
    'Standing': 'Standing',
    'Lying': 'Lying',
    'Resting': 'Resting',
    'Running': 'Running',
    'Ruminating': 'Ruminating',
    'Heat Stress Risk': 'Heat Stress Risk'
}

def train_user_dataset():
    print("==========================================================")
    print(" Training Cow Health ML Model on Uploaded Datasets")
    print("==========================================================")

    project_dir = os.path.dirname(backend_dir)
    act_path = os.path.join(project_dir, "activity.xlsx")
    base_csv_path = os.path.join(project_dir, "baseline_Feature_Extracted_800.csv")
    heat_csv_path = os.path.join(project_dir, "heat data.csv")

    X_extracted = []
    y_extracted = []

    # 1. Process activity.xlsx
    if os.path.exists(act_path):
        print(f"[1/3] Loading raw sequence dataset from: {os.path.basename(act_path)}...")
        df_act = pd.read_excel(act_path)
        print(f"      Loaded {len(df_act)} sample points.")
        
        acc_x_col = 'AccX' if 'AccX' in df_act.columns else 'x'
        acc_y_col = 'AccY' if 'AccY' in df_act.columns else 'y'
        acc_z_col = 'AccZ' if 'AccZ' in df_act.columns else 'z'
        act_col = 'Activity' if 'Activity' in df_act.columns else 'label'

        vals = df_act[[acc_x_col, acc_y_col, acc_z_col]].fillna(0).to_numpy()
        labels = df_act[act_col].astype(str).to_numpy()
        
        n_windows = len(vals) // 80
        truncated_len = n_windows * 80
        
        val_windows = vals[:truncated_len].reshape(n_windows, 80, 3)
        lbl_windows = labels[:truncated_len].reshape(n_windows, 80)
        
        count_act_windows = 0
        for i in range(n_windows):
            raw_lbl = str(lbl_windows[i, 0]).strip()
            target_lbl = LABEL_MAP.get(raw_lbl, "Unknown")
            if target_lbl != "Unknown":
                feat = extract_window_features(val_windows[i, :, 0], val_windows[i, :, 1], val_windows[i, :, 2])
                X_extracted.append(feat)
                y_extracted.append(target_lbl)
                count_act_windows += 1

        print(f"      Extracted {count_act_windows} time-series windows from activity.xlsx.")

    # 2. Process baseline_Feature_Extracted_800.csv
    if os.path.exists(base_csv_path):
        print(f"[2/3] Loading feature dataset from: {os.path.basename(base_csv_path)}...")
        df_base = pd.read_csv(base_csv_path)
        print(f"      Loaded {len(df_base)} records.")

        count_base_windows = 0
        for idx, row in df_base.iterrows():
            raw_label = str(row.get('Activity', row.get('label', 'Standing'))).strip()
            target_label = LABEL_MAP.get(raw_label, "Standing")

            if target_label != "Unknown":
                x_mean, x_std = row.get('AccX_mean', row.get('AccX', 0)), row.get('AccX_std', 1.0)
                y_mean, y_std = row.get('AccY_mean', row.get('AccY', 0)), row.get('AccY_std', 1.0)
                z_mean, z_std = row.get('AccZ_mean', row.get('AccZ', 0)), row.get('AccZ_std', 1.0)

                x_seq = np.random.normal(x_mean, max(0.1, x_std), 80).tolist()
                y_seq = np.random.normal(y_mean, max(0.1, y_std), 80).tolist()
                z_seq = np.random.normal(z_mean, max(0.1, z_std), 80).tolist()

                feat = extract_window_features(x_seq, y_seq, z_seq)
                X_extracted.append(feat)
                y_extracted.append(target_label)
                count_base_windows += 1

        print(f"      Extracted {count_base_windows} windows from baseline_Feature_Extracted_800.csv.")

    # 3. Process heat data.csv for Heat Stress Risk window training (ALL 1.04 million rows)
    if os.path.exists(heat_csv_path):
        print(f"[3/3] Loading full heat stress dataset from: {os.path.basename(heat_csv_path)}...")
        df_heat = pd.read_csv(heat_csv_path, usecols=['AccX', 'AccY', 'AccZ', 'heat'])
        print(f"      Loaded {len(df_heat)} sample rows from full heat dataset.")

        vals = df_heat[['AccX', 'AccY', 'AccZ', 'heat']].fillna(0).to_numpy()
        n_windows = len(vals) // 80
        truncated_len = n_windows * 80
        
        val_windows = vals[:truncated_len].reshape(n_windows, 80, 4)
        count_heat_windows = 0
        for i in range(n_windows):
            chunk = val_windows[i]
            is_heat = bool((chunk[:, 3] == 1).any())
            target_label = "Heat Stress Risk" if is_heat else "Resting"
            
            feat = extract_window_features(chunk[:, 0], chunk[:, 1], chunk[:, 2])
            X_extracted.append(feat)
            y_extracted.append(target_label)
            count_heat_windows += 1

        print(f"      Extracted {count_heat_windows} windows from full heat data.csv.")

    if len(X_extracted) == 0:
        print("[Error] No valid telemetry windows could be extracted from uploaded files.")
        return

    X_arr = np.array(X_extracted)
    y_arr = np.array(y_extracted)

    print(f"\n Total Combined Training Dataset: {len(y_arr)} sequence windows.")
    print("Label Breakdown:")
    unique_labels, label_counts = np.unique(y_arr, return_counts=True)
    for lbl, cnt in zip(unique_labels, label_counts):
        print(f"   - {lbl}: {cnt} windows ({round((cnt/len(y_arr))*100, 1)}%)")

    # Train ML Pipeline
    pipeline = CowHealthMLPipeline()
    info = pipeline.train(X_arr, y_arr)

    # Save to model pickle file
    model_dir = os.path.dirname(MODEL_FILE_PATH)
    if not os.path.exists(model_dir):
        os.makedirs(model_dir, exist_ok=True)

    joblib.dump(pipeline, MODEL_FILE_PATH)

    print("\n==========================================================")
    print(" MODEL RETRAINING & PICKLE SAVE COMPLETE!")
    print(f"    Trained Accuracy: {info['accuracy'] * 100:.2f}%")
    print(f"    Total Samples:    {info['sample_count']}")
    print(f"    Saved Pickle:     {MODEL_FILE_PATH}")
    print("==========================================================")

if __name__ == "__main__":
    train_user_dataset()
