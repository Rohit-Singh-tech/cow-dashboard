import io
import os
import math
import random
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score

MODEL_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "cow_health_ml.pkl")

# Primary prediction target labels
PRIMARY_LABELS = [
    "Standing",
    "Walking",
    "Running",
    "Grazing",
    "Resting",
    "Lying",
    "Drinking",
    "Ruminating",
    "Heat Stress Risk",
    "Unknown"
]

# Secondary health indicators
HEALTH_INDICATORS = [
    "Healthy",
    "Low Activity",
    "Heat Stress Risk",
    "Lameness Risk",
    "Feeding Reduction",
    "Excessive Resting",
    "Abnormal Behavior"
]


def extract_window_features(x_seq, y_seq, z_seq):
    """Extract statistical time-series features and raw window values from an 80-sample 3-axis window."""
    x = np.asarray(x_seq, dtype=float)[:80]
    y = np.asarray(y_seq, dtype=float)[:80]
    z = np.asarray(z_seq, dtype=float)[:80]

    if len(x) < 80:
        x = np.pad(x, (0, 80 - len(x)), 'edge')
        y = np.pad(y, (0, 80 - len(y)), 'edge')
        z = np.pad(z, (0, 80 - len(z)), 'edge')

    mag = np.sqrt(x*x + y*y + z*z)

    features = []
    for arr in (x, y, z, mag):
        m = float(np.mean(arr))
        s = float(np.std(arr))
        mn = float(np.min(arr))
        mx = float(np.max(arr))
        rms = float(np.sqrt(np.mean(arr*arr)))
        features.extend([m, s, mn, mx, rms, mx - mn, 0.0])

    features.extend([0.0, 0.0, 0.0])
    features.extend(x)
    features.extend(y)
    features.extend(z)

    return np.array(features, dtype=float)


def generate_synthetic_dataset(samples_per_label=150):
    """Generate synthetic time-series accelerometer telemetry for initial ML model training."""
    np.random.seed(42)
    X_list = []
    y_list = []

    behaviors = [
        "Standing", "Walking", "Running", "Grazing",
        "Resting", "Lying", "Drinking", "Ruminating"
    ]

    t = np.linspace(0, 8, 80)

    for label in behaviors:
        for _ in range(samples_per_label):
            if label == "Standing":
                x = np.random.normal(2, 1.5, 80) + np.sin(2 * np.pi * 0.2 * t)
                y = np.random.normal(1, 1.5, 80) + np.cos(2 * np.pi * 0.2 * t)
                z = np.random.normal(62, 2.0, 80)
            elif label == "Resting":
                x = np.random.normal(0, 0.5, 80)
                y = np.random.normal(0, 0.5, 80)
                z = np.random.normal(64, 0.8, 80)
            elif label == "Lying":
                x = np.random.normal(55, 2.0, 80)
                y = np.random.normal(12, 1.5, 80)
                z = np.random.normal(15, 1.5, 80)
            elif label == "Walking":
                freq = np.random.uniform(1.2, 1.8)
                x = 10 * np.sin(2 * np.pi * freq * t) + np.random.normal(5, 2, 80)
                y = 5 * np.cos(2 * np.pi * freq * t) + np.random.normal(2, 2, 80)
                z = 50 + 15 * np.sin(2 * np.pi * freq * t * 2) + np.random.normal(0, 3, 80)
            elif label == "Running":
                freq = np.random.uniform(3.0, 4.0)
                x = 35 * np.sin(2 * np.pi * freq * t) + np.random.normal(10, 5, 80)
                y = 20 * np.cos(2 * np.pi * freq * t) + np.random.normal(5, 5, 80)
                z = 40 + 35 * np.sin(2 * np.pi * freq * t) + np.random.normal(0, 6, 80)
            elif label == "Grazing":
                freq = np.random.uniform(0.4, 0.7)
                x = 15 * np.sin(2 * np.pi * freq * t) + np.random.normal(8, 3, 80)
                y = 8 * np.cos(2 * np.pi * freq * t) + np.random.normal(4, 2, 80)
                z = 25 + 8 * np.sin(2 * np.pi * freq * t) + np.random.normal(0, 2.5, 80)
            elif label == "Drinking":
                x = np.random.normal(5, 1.5, 80) + 3 * np.sin(2 * np.pi * 0.3 * t)
                y = np.random.normal(3, 1.0, 80)
                z = 18 + 4 * np.sin(2 * np.pi * 2.5 * t) + np.random.normal(0, 1.5, 80)
            elif label == "Ruminating":
                freq = 2.0
                x = np.random.normal(2, 1.0, 80) + 3 * np.sin(2 * np.pi * freq * t)
                y = np.random.normal(1, 1.0, 80) + 2 * np.cos(2 * np.pi * freq * t)
                z = 60 + 5 * np.sin(2 * np.pi * freq * t) + np.random.normal(0, 1.2, 80)

            feat = extract_window_features(x, y, z)
            X_list.append(feat)
            y_list.append(label)

    return np.array(X_list), np.array(y_list)


import torch
import torch.nn as nn
import torch.nn.functional as F

class SelfAttention1D(nn.Module):
    def __init__(self, hidden_dim):
        super().__init__()
        self.projection = nn.Linear(hidden_dim, hidden_dim)
        self.query = nn.Linear(hidden_dim, 1, bias=False)

    def forward(self, x):
        # x shape: (batch_size, seq_len, hidden_dim)
        keys = torch.tanh(self.projection(x))
        weights = F.softmax(self.query(keys), dim=1)
        context = torch.sum(x * weights, dim=1)
        return context, weights

class CNN1D_BiLSTM_Attention(nn.Module):
    def __init__(self, in_channels=3, num_classes=9, lstm_hidden=64):
        super().__init__()
        # 1. 1D CNN Local Feature Extractor
        self.conv1 = nn.Conv1d(in_channels=in_channels, out_channels=32, kernel_size=5, padding=2)
        self.bn1 = nn.BatchNorm1d(32)
        self.conv2 = nn.Conv1d(in_channels=32, out_channels=64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm1d(64)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.3)

        # 2. BiLSTM Temporal Sequence Model
        self.bilstm = nn.LSTM(input_size=64, hidden_size=lstm_hidden, num_layers=2, batch_first=True, bidirectional=True)

        # 3. Attention Mechanism
        self.attention = SelfAttention1D(hidden_dim=lstm_hidden * 2)

        # 4. Dense Softmax Classifier
        self.fc1 = nn.Linear(lstm_hidden * 2, 64)
        self.fc2 = nn.Linear(64, num_classes)

    def forward(self, x):
        # x input shape: (batch_size, seq_len=80, channels=3)
        x = x.transpose(1, 2) # (batch_size, channels=3, seq_len=80)
        x = self.relu(self.bn1(self.conv1(x)))
        x = self.relu(self.bn2(self.conv2(x)))
        
        x = x.transpose(1, 2) # (batch_size, seq_len=80, 64)
        lstm_out, _ = self.bilstm(x)
        context, attn_weights = self.attention(lstm_out)

        out = self.dropout(self.relu(self.fc1(context)))
        logits = self.fc2(out)
        return logits, attn_weights


class CowHealthMLPipeline:
    def __init__(self):
        self.scaler = StandardScaler()
        self.classes_ = np.array([
            "Standing", "Walking", "Running", "Grazing",
            "Resting", "Lying", "Drinking", "Ruminating", "Heat Stress Risk"
        ])
        self.dl_model = CNN1D_BiLSTM_Attention(in_channels=3, num_classes=len(self.classes_))
        self.anomaly_detector = IsolationForest(contamination=0.04, random_state=42)
        self.is_trained = False
        self.training_info = {}

    def train(self, X, y, epochs=5, batch_size=512, lr=0.01):
        # 1. Scale tabular summary features for IsolationForest
        X_scaled = self.scaler.fit_transform(X)
        self.anomaly_detector.fit(X_scaled)

        # 2. Vectorized extraction of (N, 80, 3) XYZ tensor sequences for PyTorch Deep Learning
        x_seqs = X[:, 31:111]
        y_seqs = X[:, 111:191]
        z_seqs = X[:, 191:271]
        raw_sequences = np.stack([x_seqs, y_seqs, z_seqs], axis=-1) # (N, 80, 3)

        X_tensors = torch.tensor(raw_sequences, dtype=torch.float32)
        
        # Map label strings to indices
        label_to_idx = {c: i for i, c in enumerate(self.classes_)}
        y_indices = np.array([label_to_idx.get(str(lbl), 0) for lbl in y])
        y_tensors = torch.tensor(y_indices, dtype=torch.long)

        # PyTorch Training Loop
        dataset = torch.utils.data.TensorDataset(X_tensors, y_tensors)
        loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)

        optimizer = torch.optim.Adam(self.dl_model.parameters(), lr=lr)
        criterion = nn.CrossEntropyLoss()

        self.dl_model.train()
        for epoch in range(epochs):
            for batch_x, batch_y in loader:
                optimizer.zero_grad()
                logits, _ = self.dl_model(batch_x)
                loss = criterion(logits, batch_y)
                loss.backward()
                optimizer.step()

        # Evaluate Accuracy
        self.dl_model.eval()
        with torch.no_grad():
            logits_all, _ = self.dl_model(X_tensors)
            preds_all = torch.argmax(logits_all, dim=1).numpy()
            acc = float(accuracy_score(y_indices, preds_all))

        self.is_trained = True
        self.training_info = {
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "architecture": "1D CNN + BiLSTM + Attention Neural Network",
            "accuracy": round(acc, 4),
            "sample_count": len(y),
            "classes": self.classes_.tolist(),
            "epochs": epochs
        }
        return self.training_info

    def predict_single(self, x_seq, y_seq, z_seq):
        if not self.is_trained:
            raise RuntimeError("ML Model is not trained yet.")

        # Prepare 80-sample 3-axis tensor
        x_arr = np.array(x_seq, dtype=float)[:80]
        y_arr = np.array(y_seq, dtype=float)[:80]
        z_arr = np.array(z_seq, dtype=float)[:80]

        seq_matrix = np.column_stack([x_arr, y_arr, z_arr])
        tensor_in = torch.tensor(seq_matrix, dtype=torch.float32).unsqueeze(0) # (1, 80, 3)

        # PyTorch Deep Learning forward pass
        self.dl_model.eval()
        with torch.no_grad():
            logits, attn_weights = self.dl_model(tensor_in)
            probs = F.softmax(logits, dim=1)[0].numpy()

        max_idx = int(np.argmax(probs))
        confidence = float(round(float(probs[max_idx]), 2))
        predicted_behavior = str(self.classes_[max_idx])

        # Anomaly score via IsolationForest
        feat = extract_window_features(x_seq, y_seq, z_seq).reshape(1, -1)
        feat_scaled = self.scaler.transform(feat)
        raw_anomaly_score = self.anomaly_detector.score_samples(feat_scaled)[0]
        anomaly_score = float(np.clip(round(float((0.2 - raw_anomaly_score) / 0.8), 2), 0.0, 1.0))
        is_anomaly = bool(self.anomaly_detector.predict(feat_scaled)[0] == -1)

        if confidence < 0.20 and anomaly_score > 0.95:
            predicted_behavior = "Unknown"

        return {
            "predicted_behavior": predicted_behavior,
            "confidence": confidence,
            "anomaly_score": anomaly_score,
            "is_anomaly": is_anomaly,
            "attention_weights": attn_weights.squeeze().numpy().tolist()
        }


ml_pipeline = CowHealthMLPipeline()


def get_or_create_model():
    """Load existing pickled model from disk or train a new baseline model if not present."""
    global ml_pipeline
    
    # Cache check: if it's already loaded into memory, don't load from disk again!
    if getattr(ml_pipeline, 'is_trained', False):
        return ml_pipeline

    model_dir = os.path.dirname(MODEL_FILE_PATH)
    if not os.path.exists(model_dir):
        os.makedirs(model_dir, exist_ok=True)

    if os.path.exists(MODEL_FILE_PATH):
        try:
            loaded_pipeline = joblib.load(MODEL_FILE_PATH)
            ml_pipeline = loaded_pipeline
            print(f"[ML Model] Loaded trained ML model pickle from: {MODEL_FILE_PATH}")
            return ml_pipeline
        except Exception as e:
            print(f"[ML Model Warning] Failed to load pickle file: {e}. Retraining fresh baseline model...")

    print("[ML Model] Training baseline Cow Health ML model on synthetic accelerometer dataset...")
    X, y = generate_synthetic_dataset(samples_per_label=150)
    ml_pipeline.train(X, y)
    
    try:
        joblib.dump(ml_pipeline, MODEL_FILE_PATH)
        print(f"[ML Model] Saved baseline ML model pickle to: {MODEL_FILE_PATH}")
    except Exception as e:
        print(f"[ML Model Error] Failed to save model pickle file: {e}")

    return ml_pipeline


def infer_secondary_health_status(predictions_list, device_id=None):
    """Derive higher-level health indicators from a sequence of predicted behaviors over time for a device_id."""

    if not predictions_list:
        return {
            "health_status": "Healthy",
            "behavior_distribution": {},
            "anomalies_count": 0,
            "summary_notes": "No telemetry packets found for health inference."
        }

    total_packets = len(predictions_list)
    behavior_counts = {}
    anomaly_count = 0

    for p in predictions_list:
        b = p.get("predicted_behavior", "Unknown")
        behavior_counts[b] = behavior_counts.get(b, 0) + 1
        if b == "Unknown":
            anomaly_count += 1

    total = max(1, total_packets)
    lying_ratio = behavior_counts.get("Lying", 0) / total
    grazing_ratio = behavior_counts.get("Grazing", 0) / total
    walking_ratio = behavior_counts.get("Walking", 0) / total
    standing_ratio = behavior_counts.get("Standing", 0) / total
    resting_ratio = behavior_counts.get("Resting", 0) / total
    heat_ratio = behavior_counts.get("Heat Stress Risk", 0) / total
    unknown_ratio = anomaly_count / total

    status = "Healthy"
    notes = "Behavior distribution is within optimal parameters."

    if unknown_ratio >= 0.50:
        status = "Abnormal Behavior"
        notes = "High percentage of unclassified or irregular accelerometer patterns detected."
    elif heat_ratio >= 0.35:
        status = "Heat Stress Risk"
        notes = "High proportion of heat stress restlessness detected."

    dist_pct = {k: round((v / total_packets) * 100, 1) for k, v in behavior_counts.items()}

    return {
        "health_status": status,
        "behavior_distribution": dist_pct,
        "anomalies_count": anomaly_count,
        "total_packets": total_packets,
        "summary_notes": notes
    }


def retrain_model_from_csv(csv_content_bytes):
    """Parse uploaded CSV data, extract features, train new ML model pipeline, and overwrite cow_health_ml.pkl."""
    global ml_pipeline

    df = pd.read_csv(io.BytesIO(csv_content_bytes))
    df.columns = [c.strip() for c in df.columns]

    label_col = None
    for col in ['label', 'Label', 'Predicted_Behavior', 'behavior', 'Behavior', 'Predicted_Label']:
        if col in df.columns:
            label_col = col
            break

    if not label_col:
        raise ValueError("CSV missing label column. Please include a column named 'label' or 'Predicted_Behavior'.")

    X_list = []
    y_list = []

    if 'x_0' in df.columns and 'y_0' in df.columns and 'z_0' in df.columns:
        for idx, row in df.iterrows():
            x_seq = [row[f'x_{i}'] for i in range(80)]
            y_seq = [row[f'y_{i}'] for i in range(80)]
            z_seq = [row[f'z_{i}'] for i in range(80)]
            lbl = str(row[label_col]).strip()
            feat = extract_window_features(x_seq, y_seq, z_seq)
            X_list.append(feat)
            y_list.append(lbl)
    elif {'x', 'y', 'z'}.issubset(df.columns):
        group_col = None
        for col in ['Packet_ID', 'header_id', 'Header_ID', 'packet_id']:
            if col in df.columns:
                group_col = col
                break

        if group_col:
            grouped = df.groupby(group_col)
            for _, group in grouped:
                if len(group) >= 10:
                    x_seq = group['x'].tolist()
                    y_seq = group['y'].tolist()
                    z_seq = group['z'].tolist()
                    lbl = str(group[label_col].iloc[0]).strip()
                    feat = extract_window_features(x_seq, y_seq, z_seq)
                    X_list.append(feat)
                    y_list.append(lbl)
        else:
            num_rows = len(df)
            for i in range(0, num_rows, 80):
                chunk = df.iloc[i:i+80]
                if len(chunk) >= 10:
                    x_seq = chunk['x'].tolist()
                    y_seq = chunk['y'].tolist()
                    z_seq = chunk['z'].tolist()
                    lbl = str(chunk[label_col].iloc[0]).strip()
                    feat = extract_window_features(x_seq, y_seq, z_seq)
                    X_list.append(feat)
                    y_list.append(lbl)

    if len(X_list) < 5:
        raise ValueError(f"Insufficient valid window samples extracted ({len(X_list)} windows found). Need at least 5 sample windows.")

    X_arr = np.array(X_list)
    y_arr = np.array(y_list)

    new_pipeline = CowHealthMLPipeline()
    info = new_pipeline.train(X_arr, y_arr)

    ml_pipeline = new_pipeline
    joblib.dump(ml_pipeline, MODEL_FILE_PATH)
    print(f"[ML Model] Retrained & updated model pickle at {MODEL_FILE_PATH} with {len(y_arr)} custom samples.")

    return info


def calculate_autoencoder_reconstruction(x_seq, y_seq, z_seq):
    """Simulate CNN+BiLSTM Autoencoder signal reconstruction and calculate MSE loss."""
    x = np.array(x_seq, dtype=float)[:80]
    y = np.array(y_seq, dtype=float)[:80]
    z = np.array(z_seq, dtype=float)[:80]

    # Reconstructed signal smooth approximation
    from scipy.ndimage import gaussian_filter1d
    x_recon = gaussian_filter1d(x, sigma=1.2)
    y_recon = gaussian_filter1d(y, sigma=1.2)
    z_recon = gaussian_filter1d(z, sigma=1.2)

    # Compute MSE loss
    mse_x = float(np.mean((x - x_recon) ** 2))
    mse_y = float(np.mean((y - y_recon) ** 2))
    mse_z = float(np.mean((z - z_recon) ** 2))
    total_mse = float(round((mse_x + mse_y + mse_z) / 3.0, 4))

    return {
        "mse": total_mse,
        "original": {"x": x.tolist(), "y": y.tolist(), "z": z.tolist()},
        "reconstructed": {"x": x_recon.tolist(), "y": y_recon.tolist(), "z": z_recon.tolist()}
    }


def get_feature_radar_metrics(x_seq, y_seq, z_seq, is_anomaly=False):
    """Compute feature radar metrics for Selected Animal vs Normal Benchmark."""
    x = np.array(x_seq, dtype=float)
    y = np.array(y_seq, dtype=float)
    z = np.array(z_seq, dtype=float)

    mag = np.sqrt(x**2 + y**2 + z**2)
    motion_energy = min(100.0, float(np.mean(mag) * 8.5))
    variance = min(100.0, float(np.var(mag) * 15.0))
    activity_index = min(100.0, float(np.std(mag) * 22.0))
    rest_ratio = max(0.0, min(100.0, 100.0 - activity_index * 1.1))
    night_activity = min(100.0, float(activity_index * 0.4 + random.uniform(5, 15)))
    anomaly_val = 95.0 if is_anomaly else min(100.0, float(variance * 1.2))

    return {
        "animal": [
            {"subject": "Motion Energy", "value": round(motion_energy, 1), "fullMark": 100},
            {"subject": "Rest Ratio", "value": round(rest_ratio, 1), "fullMark": 100},
            {"subject": "Activity Index", "value": round(activity_index, 1), "fullMark": 100},
            {"subject": "Night Activity", "value": round(night_activity, 1), "fullMark": 100},
            {"subject": "Anomaly Score", "value": round(anomaly_val, 1), "fullMark": 100},
            {"subject": "Variance", "value": round(variance, 1), "fullMark": 100}
        ],
        "normal_benchmark": [
            {"subject": "Motion Energy", "value": 45.0, "fullMark": 100},
            {"subject": "Rest Ratio", "value": 75.0, "fullMark": 100},
            {"subject": "Activity Index", "value": 30.0, "fullMark": 100},
            {"subject": "Night Activity", "value": 12.0, "fullMark": 100},
            {"subject": "Anomaly Score", "value": 15.0, "fullMark": 100},
            {"subject": "Variance", "value": 20.0, "fullMark": 100}
        ]
    }
