import numpy as np
from typing import List, Tuple, Dict, Any

def compute_dtw_alignment(
    series_ref: np.ndarray,
    series_part: np.ndarray,
    window_constraint: float = 0.25
) -> Tuple[List[Tuple[int, int]], float]:
    """
    Computes Dynamic Time Warping (DTW) alignment between two 1D or 2D feature sequences
    with a Sakoe-Chiba band constraint to prevent unrealistic temporal distortion.
    Returns (warping_path, normalized_distance).
    """
    # Ensure 2D (num_frames, num_features)
    if series_ref.ndim == 1:
        series_ref = series_ref[:, np.newaxis]
    if series_part.ndim == 1:
        series_part = series_part[:, np.newaxis]
        
    n = len(series_ref)
    m = len(series_part)
    
    if n == 0 or m == 0:
        return [], 0.0
        
    # Standardize series for distance comparison
    norm_ref = (series_ref - np.mean(series_ref, axis=0)) / (np.std(series_ref, axis=0) + 1e-8)
    norm_part = (series_part - np.mean(series_part, axis=0)) / (np.std(series_part, axis=0) + 1e-8)
    
    # Sakoe-Chiba window width
    w = max(int(max(n, m) * window_constraint), abs(n - m) + 1)
    
    cost_matrix = np.full((n + 1, m + 1), np.inf, dtype=np.float32)
    cost_matrix[0, 0] = 0.0
    
    for i in range(1, n + 1):
        j_start = max(1, i - w)
        j_end = min(m + 1, i + w)
        for j in range(j_start, j_end):
            # Euclidean distance between feature vectors
            dist = np.linalg.norm(norm_ref[i - 1] - norm_part[j - 1])
            cost_matrix[i, j] = dist + min(
                cost_matrix[i - 1, j],     # insertion
                cost_matrix[i, j - 1],     # deletion
                cost_matrix[i - 1, j - 1]  # match
            )
            
    total_cost = cost_matrix[n, m]
    if np.isinf(total_cost):
        # Fallback linear alignment if constraint was too strict
        path = [(int(round(k * (n - 1) / max(1, m - 1))), k) for k in range(m)]
        return path, 1.0
        
    # Backtrack to find optimal path
    i, j = n, m
    path = []
    while i > 0 and j > 0:
        path.append((i - 1, j - 1))
        steps = [
            (cost_matrix[i - 1, j - 1], i - 1, j - 1),
            (cost_matrix[i - 1, j], i - 1, j),
            (cost_matrix[i, j - 1], i, j - 1)
        ]
        steps.sort(key=lambda x: x[0])
        _, i, j = steps[0]
        
    path.reverse()
    normalized_dist = float(total_cost / (n + m))
    return path, round(normalized_dist, 4)

def align_time_series_by_dtw(
    times_ref: List[float],
    values_ref: List[float],
    times_part: List[float],
    values_part: List[float]
) -> List[Dict[str, Any]]:
    """
    Creates synchronized comparison points aligned via time warping or uniform grid.
    """
    # Build uniform grid across maximum duration
    max_duration = max(times_ref[-1] if times_ref else 0.0, times_part[-1] if times_part else 0.0)
    grid_points = 80
    time_grid = np.linspace(0, max_duration, grid_points)
    
    ref_interp = np.interp(time_grid, times_ref, values_ref) if len(times_ref) > 1 else np.zeros(grid_points)
    part_interp = np.interp(time_grid, times_part, values_part) if len(times_part) > 1 else np.zeros(grid_points)
    
    aligned_series = []
    for t, r_val, p_val in zip(time_grid, ref_interp, part_interp):
        aligned_series.append({
            "time": round(float(t), 2),
            "reference": round(float(r_val), 2),
            "participant": round(float(p_val), 2),
            "delta": round(float(p_val - r_val), 2)
        })
        
    return aligned_series
