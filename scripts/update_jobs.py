import json
import re
import urllib.parse
import urllib.request
from pathlib import Path
from datetime import datetime, timezone, timedelta
import xml.etree.ElementTree as ET


# ==========================================
# CHHATRAPATI PRINT PORTAL
# Automatic Latest Jobs + Admit Cards
# ==========================================

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_FILE = BASE_DIR / "jobs.json"


# Official Maharashtra sources
SOURCES = [
    ("Maharashtra Government", "maharashtra.gov.in"),
    ("NHM Maharashtra", "nhm.maharashtra.gov.in"),
    ("DMER Maharashtra", "dmer.maharashtra.gov.in"),
    ("DTE Maharashtra", "dte.maharashtra.gov.in"),
]


KEYWORDS = [
    "recruitment",
    "recruitment 2026",
    "vacancy",
    "vacancies",
    "bharti",
    "भरती",
    "जाहिरात",
    "recruitment notification",
    "admit card",
    "admit card 2026",
    "hall ticket",
    "hall ticket 2026",
    "प्रवेशपत्र",
    "परीक्षा",
]


# Keep only recent results
DAYS_LIMIT = 120


def fetch_url(url):
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0"
        }
    )

    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read()


def fetch_google_news(source_domain, keyword):
    query = f"site:{source_domain} {keyword}"

    encoded_query = urllib.parse.quote(query)

    url = (
        "https://news.google.com/rss/search?"
        f"q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"
    )

    try:
        return fetch_url(url)
    except Exception:
        return b""


def parse_date(date_text):
    if not date_text:
        return None

    formats = [
        "%a, %d %b %Y %H:%M:%S %Z",
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S GMT",
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(date_text, fmt)

            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)

            return dt
        except Exception:
            pass

    return None


def clean_text(text):
    if not text:
        return ""

    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def classify(title):
    title_lower = title.lower()

    admit_words = [
        "admit card",
        "hall ticket",
        "प्रवेशपत्र",
        "प्रवेश पत्र",
        "exam call letter",
    ]

    for word in admit_words:
        if word in title_lower:
            return "Admit Card"

    return "Job"


def get_status(item_type):
    if item_type == "Admit Card":
        return "NEW"

    return "NEW"


def build_item(title, source_name, details_url, published):
    item_type = classify(title)

    return {
        "type": item_type,
        "title": clean_text(title),
        "department": source_name,
        "qualification": "See Official Notification",
        "last_date": "See Official Notification",
        "status": get_status(item_type),
        "details_url": details_url,
        "apply_url": details_url,
        "published": published,
    }


def parse_rss(xml_data, source_name):
    results = []

    if not xml_data:
        return results

    try:
        root = ET.fromstring(xml_data)
    except Exception:
        return results

    now = datetime.now(timezone.utc)
    minimum_date = now - timedelta(days=DAYS_LIMIT)

    for item in root.findall(".//item"):

        title_node = item.find("title")
        link_node = item.find("link")
        date_node = item.find("pubDate")

        title = title_node.text if title_node is not None else ""
        link = link_node.text if link_node is not None else ""
        date_text = date_node.text if date_node is not None else ""

        title = clean_text(title)
        link = clean_text(link)
# Ignore old/archive/non-current recruitment pages
        title_lower = title.lower()

        blocked_terms = [
            "2023",
            "2022",
            "2021",
            "2020",
            "archive",
            "archives",
            "page 2",
            "page 3",
            "page 4",
            "page 5",
            "page 6",
        ]

        if any(term in title_lower for term in blocked_terms):
            continue
        if not title or not link:
            continue

        published_dt = parse_date(date_text)

        # Remove old Google News results
        if published_dt is not None:
            if published_dt < minimum_date:
                continue

        item_type = classify(title)

        # Only Jobs and Admit Cards
        useful_words = [
            "recruitment",
            "vacancy",
            "bharti",
            "भरती",
            "जाहिरात",
            "admit",
            "hall ticket",
            "प्रवेशपत्र",
            "exam",
            "परीक्षा",
            "appointment",
            "post",
            "जागा",
        ]

        title_lower = title.lower()

        if not any(word in title_lower for word in useful_words):
            continue

        results.append(
            build_item(
                title,
                source_name,
                link,
                date_text or "Recently Updated"
            )
        )

    return results


def load_existing():
    if not OUTPUT_FILE.exists():
        return []

    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)

        if isinstance(data, list):
            return data

    except Exception:
        pass

    return []


def save_jobs(jobs):
    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(
            jobs,
            file,
            ensure_ascii=False,
            indent=2
        )


def main():

    print("======================================")
    print("Chhatrapati Print Portal")
    print("Updating Latest Jobs + Admit Cards")
    print("======================================")

    all_jobs = []

    for source_name, domain in SOURCES:

        print(f"Checking: {source_name}")

        for keyword in KEYWORDS:

            xml_data = fetch_google_news(domain, keyword)

            results = parse_rss(
                xml_data,
                source_name
            )

            all_jobs.extend(results)

    # Load previous data
    old_jobs = load_existing()

    # Merge
    combined = old_jobs + all_jobs

    # Remove duplicates
    unique = {}

    for job in combined:

        key = (
            job.get("details_url")
            or job.get("title")
            or ""
        ).strip().lower()

        if not key:
            continue

        unique[key] = job

    jobs = list(unique.values())

    # Sort newest first
    def sort_key(job):

        date_text = job.get("published", "")

        dt = parse_date(date_text)

        if dt:
            return dt.timestamp()

        return 0

    jobs.sort(
        key=sort_key,
        reverse=True
    )

    # Keep only latest 100
    jobs = jobs[:100]

    save_jobs(jobs)

    job_count = sum(
        1 for x in jobs
        if x.get("type") == "Job"
    )

    admit_count = sum(
        1 for x in jobs
        if x.get("type") == "Admit Card"
    )

    print("--------------------------------------")
    print(f"Total Jobs       : {job_count}")
    print(f"Total Admit Cards: {admit_count}")
    print(f"Total Records    : {len(jobs)}")
    print("--------------------------------------")
    print("jobs.json updated successfully.")
    print("======================================")


if __name__ == "__main__":
    main()
