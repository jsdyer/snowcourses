"""Publish independently addressable observations and their sitemap from the staged edition."""
from html import escape
import re
import unicodedata
from xml.etree import ElementTree as ET


def slug(value):
    ascii_name = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")


def link(url, name):
    return f'<a href="{escape(url, quote=True)}">{escape(name)}</a>'


def table(caption, headings, rows):
    head = "".join(f'<th scope="col">{escape(label)}</th>' for label in headings)
    body = []
    for first, *rest in rows:
        cells = "".join(f'<td>{escape(str(value))}</td>' for value in rest)
        body.append(f'<tr><th scope="row">{escape(str(first))}</th>{cells}</tr>')
    return (f'<table><caption>{escape(caption)}</caption><thead><tr>{head}</tr></thead>'
            f'<tbody>{"".join(body)}</tbody></table>')


def page(url, title, intro, navigation, body):
    return f"""<!doctype html>
<html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)} · CoolCode</title><meta name="description" content="{escape(intro, quote=True)}">
<link rel="canonical" href="{escape(url, quote=True)}"><link rel="stylesheet" href="/assets/desk.css">
<link rel="icon" href="/favicon.svg"></head><body><a class="skip" href="#main">Skip to results</a>
<header><div class="bar"><a class="brand" href="/">CoolCode.ca</a><nav>{navigation}</nav></div></header>
<main id="main"><h1>{escape(title)}</h1><p>{escape(intro)}</p>{body}</main></body></html>"""


def publish(stage, tool, folder, directory_title, directory_intro, records):
    root = "https://coolcode.ca" + tool["url"]
    directory = stage / folder
    directory.mkdir()
    directory_url = root + folder + "/"
    root_link = link(root, tool["title"])
    nav = root_link + " " + link(directory_url, directory_title)
    urls = [directory_url]
    groups = {}
    for key, label, title, intro, body in sorted(records, key=lambda record: record[1].casefold()):
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", key):
            raise ValueError(f"Invalid result route: {key!r}")
        target = directory / key
        target.mkdir()  # Collisions must fail the build, never replace a different record.
        url = directory_url + key + "/"
        (target / "index.html").write_text(page(url, title, intro, nav, body), encoding="utf-8")
        urls.append(url)
        letter = label[0].upper() if label[0].isascii() and label[0].isalpha() else "Other"
        groups.setdefault(letter, []).append("<li>" + link(url, label) + "</li>")
    if not groups:
        raise ValueError(f"No publishable results for {tool['id']}")
    body = '<nav aria-label="Jump to stations by name">' + ' · '.join(link("#letter-" + letter, letter) for letter in groups) + '</nav>'
    for letter, entries in groups.items():
        body += f'<h2 id="letter-{letter}">{letter}</h2><ul>' + '\n'.join(entries) + '</ul>'
    (directory / "index.html").write_text(page(directory_url, directory_title, directory_intro, root_link, body), encoding="utf-8")
    sitemap = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for url in urls:
        ET.SubElement(ET.SubElement(sitemap, "url"), "loc").text = url
    ET.indent(sitemap)
    ET.ElementTree(sitemap).write(stage / "sitemap.xml", encoding="utf-8", xml_declaration=True)
