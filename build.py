#!/usr/bin/env python3
"""Wrap the artifact body in a standalone document for GitHub Pages."""
import sys, pathlib
src = sys.argv[1] if len(sys.argv) > 1 else '../../../private/tmp/slow-bloom.html'
body = pathlib.Path(src).read_text()
ICON = ("data:image/svg+xml,"
  "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
  "%3Crect width='32' height='32' rx='7' fill='%23f4f1ea'/%3E"
  "%3Crect x='14.4' y='3.5' width='3.2' height='14.5' rx='1.6' fill='%23b2905f'/%3E"
  "%3Crect x='13.4' y='16' width='5.2' height='3' rx='1' fill='%237d8894'/%3E"
  "%3Crect x='7' y='18.5' width='18' height='7' rx='2.6' fill='%23eef3f6' "
  "stroke='%238fa0ad' stroke-width='1.4'/%3E"
  "%3Cpath d='M10 25.5v3.2M14 25.5v3.8M18 25.5v3.4M22 25.5v2.8' stroke='%23b9c7d1' "
  "stroke-width='1.7' stroke-linecap='round'/%3E%3C/svg%3E")
head = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="A simple social floor mopping game inspired by Hozy, with an ant sorting game and a mosaic painter alongside it.">
<link rel="icon" href="{ICON}">
<link rel="apple-touch-icon" href="{ICON}">
<meta property="og:title" content="SlowBroom">
<meta property="og:description" content="A quiet browser mopping game. Arrow keys, no score, no way to lose.">
<style>
  :root{{color-scheme:light}}
  body{{margin:0; font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; background:#faf9f7}}
  img{{max-width:100%}}
  [hidden]{{display:none!important}}
</style>
"""
i = body.index('</style>') + len('</style>')
pathlib.Path('index.html').write_text(head + body[:i] + "\n</head>\n<body>\n" + body[i:] + "\n</body>\n</html>\n")
print("index.html built")
