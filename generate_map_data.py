"""
Preprocess 13 yearly GeoJSON files into a single compact JSON
for browser-based D3.js rendering. Simplifies geometries and
bundles all year data into one lightweight file.
"""

import geopandas as gpd
import json
import os

GEOJSON_DIR = r"C:\Users\rocke\Desktop\personal projects\academic\india-nightlights-districts\output\geojson"
YEARS = list(range(2012, 2025))
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(SCRIPT_DIR, "public", "writings", "india-districts-data.json")


def round_coords(coords, precision=3):
    if isinstance(coords, (list, tuple)):
        if coords and isinstance(coords[0], (int, float)):
            return [round(c, precision) for c in coords]
        return [round_coords(c, precision) for c in coords]
    return coords


def main():
    print("Loading base geometry (2012)...")
    gdf = gpd.read_file(os.path.join(GEOJSON_DIR, "nightlights_districts_2012.geojson"))

    print(f"Simplifying {len(gdf)} district geometries...")
    gdf.geometry = gdf.geometry.simplify(tolerance=0.008, preserve_topology=True)

    features = []
    for _, row in gdf.iterrows():
        geom = row.geometry.__geo_interface__
        features.append({
            "type": "Feature",
            "properties": {
                "id": str(row["district_id"]),
                "n": row["district_name"],
                "s": row["state_name"]
            },
            "geometry": {
                "type": geom["type"],
                "coordinates": round_coords(geom["coordinates"], 3)
            }
        })

    print("Loading year data...")
    data = {}
    for year in YEARS:
        print(f"  {year}...")
        gdf_year = gpd.read_file(
            os.path.join(GEOJSON_DIR, f"nightlights_districts_{year}.geojson")
        )
        for _, row in gdf_year.iterrows():
            did = str(row["district_id"])
            if did not in data:
                data[did] = []
            data[did].append(round(float(row["mean"]), 4))

    output = {
        "type": "FeatureCollection",
        "features": features,
        "years": YEARS,
        "data": data
    }

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(output, f, separators=(',', ':'))

    size_mb = os.path.getsize(OUTPUT) / (1024 * 1024)
    print(f"Output: {OUTPUT}")
    print(f"Size: {size_mb:.2f} MB ({len(features)} features, {len(YEARS)} years)")


if __name__ == "__main__":
    main()
