import json
import re
import urllib.parse
import urllib.request
from pathlib import Path
from xml.etree import ElementTree as ET

# Official sources — पुढे अजून sources जोडता येतील
SOURCES = [
    ("Maharashtra Govt Jobs", "maharashtra.gov.in"),
    ("Maharashtra NHM", "nhm.maharashtra.gov.in"),
    ("Maharashtra DMER", "dmer.maharashtra.gov.in"),
]

KEYWORDS = [
    "recruitment",
    "vacancy",
    "bharti",
    "भरती",
    "admit card",
    "hall ticket",
    "प्रवेशपत्र"
]


def fetch_rss(query):
    encoded_query = urllib.parse.quote(query)

    url = (
        "https://news.google.com/rss/search?"
        f"q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"
    )

    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0"}
    )

    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read()


def clean_text(text):
    return re.sub(r"<[^>]+>", "", text or "").strip()


def main():

    jobs_file = Path("jobs.json")

    # Existing jobs वाचा
    if jobs_file.exists():
        try:
            existing = json.loads(
                jobs_file.read_text(encoding="utf-8")
            )
        except Exception:
            existing = []
    else:
        existing = []

    new_updates = []

    for source_name, domain in SOURCES:

        query = (
            f"site:{domain} "
            f"({' OR '.join(KEYWORDS)})"
        )

        try:

            xml_data = fetch_rss(query)
            root = ET.fromstring(xml_data)

            items = root.findall("./channel/item")

            for item in items[:10]:

                title = clean_text(
                    item.findtext("title")
                )

                link = clean_text(
                    item.findtext("link")
                )

                published = clean_text(
                    item.findtext("pubDate")
                )

                if not title or not link:
                    continue

                title_lower = title.lower()

                # Admit Card ओळखणे
                if (
                    "admit card" in title_lower
                    or "hall ticket" in title_lower
                    or "प्रवेशपत्र" in title_lower
                ):
                    update_type = "Admit Card"
                else:
                    update_type = "Job"

                new_updates.append({
                    "type": update_type,
                    "title": title,
                    "department": source_name,
                    "qualification": "See Official Notification",
                    "last_date": "See Official Notification",
                    "status": "NEW",
                    "details_url": link,
                    "apply_url": link,
                    "published": published
                })

        except Exception as error:
            print(
                f"Source skipped: {domain}"
            )
            print(error)

    # Duplicate काढणे
    combined = {}

    for item in existing:
        key = (
            item.get("details_url")
            or item.get("title")
        )

        if key:
            combined[key] = item

    for item in new_updates:

        key = (
            item.get("details_url")
            or item.get("title")
        )

        if key:
            combined[key] = item

    # Latest 100 updates
    final_data = list(combined.values())[:100]

    jobs_file.write_text(
        json.dumps(
            final_data,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    print(
        f"Successfully saved {len(final_data)} updates."
    )


if __name__ == "__main__":
    main()
