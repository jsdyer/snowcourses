"""Build station profiles using the explorer's same-period, earlier-year median."""
from collections import defaultdict
from datetime import date
from gzip import open as open_gzip
from html import escape
import json
from statistics import median
from urllib.parse import urlencode
from result_pages import link, publish, slug, table

SOURCE = "https://www.env.gov.bc.ca/wsd/data_searches/snow/asws/data/"


def survey_year(row):
    observed, period = row[:2]
    return int(observed[:4]) + (period[:2] <= "02" and observed[5:7] == "12")


def latest_comparison(readings):
    periods = defaultdict(lambda: defaultdict(list))
    for row in readings:
        periods[row[1]][survey_year(row)].append(row)
    best = None
    for period, years in periods.items():
        earlier = {2: [], 3: []}
        for year, rows in sorted(years.items()):
            selected = max(rows, key=lambda row: row[0])
            for metric in (2, 3):
                baseline = earlier[metric]
                if selected[metric] is not None and not selected[4] and len(baseline) >= 2:
                    key = (selected[0], metric, period)
                    if best is None or key > best[0]:
                        best = (key, period, year, selected, metric, list(baseline), years)
                valid = [r[metric] for r in rows if r[metric] is not None and not r[4]]
                if valid:
                    baseline.append(median(valid))
    return best


def measured(value, unit):
    return "No reading" if value is None else f"{value:,.2f}".rstrip("0").rstrip(".") + " " + unit


def publish_profiles(stage, tool):
    status = json.loads((stage / "status.json").read_text())
    with open_gzip(stage / "records.json.gz", "rt", encoding="utf-8") as f:
        stations = json.load(f)
    records = []
    for code, station in stations.items():
        comparison = latest_comparison(station["readings"])
        if comparison is None:
            continue
        _, period, year, selected, metric, baseline, years = comparison
        name, mode = station["name"], station["mode"]
        metric_name, unit = ("snow water equivalent", "mm") if metric == 3 else ("snow depth", "cm")
        period_label = date.fromisoformat("2000-" + period).strftime("%B %d").replace(" 0", " ")
        reference = median(baseline)
        intro = (f"{name} recorded {measured(selected[metric], unit)} of {metric_name} on {selected[0]}. "
                 f"The median for the same {period_label} reporting period across {len(baseline)} earlier years was "
                 f"{measured(reference, unit)}.")
        query = urlencode({"station": code, "period": period, "year": year, "metric": metric})
        body = '<p>' + link(tool["url"] + "?" + query, f"Compare this period in the {name} snow explorer") + '</p>'
        history = [r for y, rows in years.items() if y <= year for r in rows]
        recent = sorted(history, key=lambda r: r[0], reverse=True)[:12]
        body += table(f"Recent observations for the {period_label} period through {selected[0]}",
                      ["Observed", "Snow depth", "Snow water equivalent", "Survey flag"],
                      [(r[0], measured(r[2], "cm"), measured(r[3], "mm"), r[4] or "—") for r in recent])
        body += (f'<h2>Station and source</h2><p>{escape(mode)}, station {escape(code)}. Each earlier year contributes '
                 'one median for the same period at this station. Flagged or missing measurements are excluded from '
                 'the comparison. Snow water equivalent measures the depth of water held in the snowpack.</p>')
        if mode == "Manual survey":
            files = [("allmss_archive.csv", "Provincial manual survey archive"), ("allmss_current.csv", "Current manual survey file")]
            body += '<p>Survey dates can differ from the nominal reporting period.</p>'
        else:
            files = [("SW_DailyArchive.csv", "Provincial daily water-equivalent archive"), ("SW.csv", "Current hourly water equivalent"),
                     ("SD.csv", "Current hourly snow depth")]
            body += '<p>This series uses automated readings at 16:00 UTC.</p>'
        body += ('<p>' + ' · '.join(link(SOURCE + file, label) for file, label in files)
                 + f'</p><p>Snapshot retrieved {escape(status["retrieved"])}. Latest observation in this station’s file '
                 + escape(max(r[0] for r in station["readings"])) + '.</p><p>'
                 + link('/riverpulse/', 'Explore Canadian river gauges and seasonal flow') + '</p>')
        title = f"{name} ({code}) snow measurements and seasonal comparison"
        records.append((slug(code), f"{name} · {code} · {mode}", title, intro, body))
    publish(stage, tool, "courses", "British Columbia snow measurements by station",
            "Choose a manual snow course or automated station to compare a dated observation with the same period in at least two earlier years.", records)
