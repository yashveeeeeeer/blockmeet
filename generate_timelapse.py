"""
Generate a nightlight timelapse GIF from yearly district-level GeoJSON files.
Outputs to public/writings/india-nightlights-timelapse.gif
"""

import os
import numpy as np
import geopandas as gpd
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.colors import LinearSegmentedColormap
import imageio.v3 as iio
from io import BytesIO

GEOJSON_DIR = r"C:\Users\rocke\Desktop\personal projects\academic\india-nightlights-districts\output\geojson"
YEARS = list(range(2012, 2025))
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "public", "writings")
OUTPUT_GIF = os.path.join(OUTPUT_DIR, "india-nightlights-timelapse.gif")
LOCAL_COPY = os.path.join(GEOJSON_DIR, "..", "india-nightlights-timelapse.gif")

BG_COLOR = "#1a1a2e"
WIDTH_PX = 1080
DPI = 150
FIG_WIDTH = WIDTH_PX / DPI

cmap_colors = [
    (0.0,  "#0a0a1a"),
    (0.15, "#1a1a2e"),
    (0.35, "#2d4a3f"),
    (0.55, "#4ecca3"),
    (0.75, "#d4a030"),
    (1.0,  "#f5c542"),
]
positions = [c[0] for c in cmap_colors]
colors = [c[1] for c in cmap_colors]
CMAP = LinearSegmentedColormap.from_list("nightlight", list(zip(positions, colors)), N=256)

def load_all_years():
    gdfs = {}
    global_min = np.inf
    global_max = -np.inf
    for year in YEARS:
        path = os.path.join(GEOJSON_DIR, f"nightlights_districts_{year}.geojson")
        print(f"  Loading {year}...")
        gdf = gpd.read_file(path)
        gdf["mean"] = gdf["mean"].astype(float)
        gdfs[year] = gdf
        vals = gdf["mean"].values
        vals_pos = vals[vals > 0]
        if len(vals_pos) > 0:
            global_min = min(global_min, vals_pos.min())
            global_max = max(global_max, vals.max())
    return gdfs, global_min, global_max


def render_frame(gdf, year, norm, fig_width, fig_height):
    fig, ax = plt.subplots(1, 1, figsize=(fig_width, fig_height), dpi=DPI)
    fig.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    ax.set_axis_off()

    mean_vals = gdf["mean"].values.copy()
    mean_vals[mean_vals <= 0] = norm.vmin

    gdf = gdf.copy()
    gdf["_plot_mean"] = mean_vals

    gdf.plot(
        column="_plot_mean",
        ax=ax,
        cmap=CMAP,
        norm=norm,
        edgecolor="none",
        linewidth=0,
        antialiased=True,
    )

    gdf.boundary.plot(ax=ax, edgecolor="#ffffff08", linewidth=0.15)

    ax.set_xlim(67.5, 98.0)
    ax.set_ylim(6.5, 37.5)
    ax.set_aspect("equal")

    ax.text(
        0.5, 0.96, "LIGHTS OF INDIA",
        transform=ax.transAxes, ha="center", va="top",
        fontsize=22, fontweight="bold", color="#e0e8f0",
        fontfamily="sans-serif",
    )

    ax.text(
        0.5, 0.91, str(year),
        transform=ax.transAxes, ha="center", va="top",
        fontsize=42, fontweight="bold", color="#f5c542",
        fontfamily="sans-serif",
    )

    ax.text(
        0.5, 0.04, "District Mean Nightlight Radiance · VIIRS/DMSP",
        transform=ax.transAxes, ha="center", va="bottom",
        fontsize=6, color="#8a94b0", fontfamily="sans-serif",
    )

    sm = plt.cm.ScalarMappable(cmap=CMAP, norm=norm)
    sm.set_array([])
    cbar_ax = fig.add_axes([0.12, 0.08, 0.76, 0.012])
    cbar = fig.colorbar(sm, cax=cbar_ax, orientation="horizontal")
    cbar.ax.tick_params(labelsize=5, colors="#8a94b0", length=2, width=0.5)
    cbar.outline.set_edgecolor("#ffffff10")
    cbar.outline.set_linewidth(0.5)
    cbar.set_label("Mean Radiance (log scale)", fontsize=5, color="#8a94b0", labelpad=2)

    fig.subplots_adjust(left=0.02, right=0.98, top=0.98, bottom=0.06)

    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=DPI, facecolor=BG_COLOR, bbox_inches="tight", pad_inches=0.15)
    plt.close(fig)
    buf.seek(0)
    return iio.imread(buf)


def main():
    print("Loading GeoJSON files...")
    gdfs, global_min, global_max = load_all_years()
    print(f"  Global range: {global_min:.4f} – {global_max:.4f}")

    norm = mcolors.LogNorm(vmin=max(global_min, 0.01), vmax=global_max)

    sample = gdfs[YEARS[0]]
    bounds = sample.total_bounds
    aspect = (bounds[3] - bounds[1]) / (bounds[2] - bounds[0])
    fig_height = FIG_WIDTH * aspect * 0.95

    print("Rendering frames...")
    frames = []
    for year in YEARS:
        print(f"  Rendering {year}...")
        frame = render_frame(gdfs[year], year, norm, FIG_WIDTH, fig_height)
        frames.append(frame)

    print(f"Writing GIF to {OUTPUT_GIF}...")
    os.makedirs(os.path.dirname(OUTPUT_GIF), exist_ok=True)

    duration_ms = 1500
    last_frame_hold = 3000

    durations = [duration_ms] * len(frames)
    durations[-1] = last_frame_hold

    iio.imwrite(
        OUTPUT_GIF,
        frames,
        duration=durations,
        loop=0,
    )

    gif_size = os.path.getsize(OUTPUT_GIF) / (1024 * 1024)
    print(f"  GIF size: {gif_size:.1f} MB")

    try:
        import shutil
        local_path = os.path.normpath(LOCAL_COPY)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        shutil.copy2(OUTPUT_GIF, local_path)
        print(f"  Local copy saved to {local_path}")
    except Exception as e:
        print(f"  Could not save local copy: {e}")

    print("Done!")


if __name__ == "__main__":
    main()
