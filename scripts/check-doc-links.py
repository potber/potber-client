"""Check inline local links in tracked project Markdown."""

import re
import subprocess
from functools import cache
from pathlib import Path
from urllib.parse import unquote, urlsplit

LINK = re.compile(r"\]\((<[^>]+>|[^\s)]+)")
FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})")
HEADING = re.compile(r"^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$")


def markdown_lines(path):
    fence = None
    for number, line in enumerate(path.read_text().splitlines(), 1):
        marker = FENCE.match(line)
        if marker:
            run = marker[1]
            if fence is None:
                fence = run
            elif run.startswith(fence) and not line[marker.end() :].strip():
                fence = None
        elif fence is None:
            yield number, line


@cache
def anchors(path):
    found = set()
    for _, line in markdown_lines(path):
        found.update(re.findall(r'<a\s+(?:id|name)="([^"]+)"', line))
        heading = HEADING.match(line)
        if heading:
            slug = re.sub(r"[^\w -]", "", heading[1].lower()).replace(" ", "-")
            anchor = slug
            suffix = 1
            while anchor in found:
                anchor = f"{slug}-{suffix}"
                suffix += 1
            found.add(anchor)
    return found


def main():
    root = Path(
        subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()
    )
    tracked = subprocess.check_output(["git", "ls-files", "-z", "--", "*.md"], cwd=root)
    count = errors = 0
    for name in tracked.decode().split("\0"):
        if not name or name.startswith("."):
            continue
        page = root / name
        for number, line in markdown_lines(page):
            for match in LINK.finditer(re.sub(r"`+[^`]*`+", "", line)):
                link = match[1].strip("<>")
                url = urlsplit(link)
                if url.scheme or url.netloc:
                    continue
                count += 1
                path = unquote(url.path)
                base = root if path.startswith("/") else page.parent
                target = (base / path.lstrip("/")).resolve() if path else page
                fragment = unquote(url.fragment)
                valid_target = target.is_relative_to(root) and target.exists()
                valid_anchor = (
                    not fragment
                    or target.suffix.lower() != ".md"
                    or (valid_target and target.is_file() and fragment in anchors(target))
                )
                if not valid_target or not valid_anchor:
                    print(f"{name}:{number}: unresolved local link {link}")
                    errors += 1
    print(f"Checked {count} local Markdown links. {errors} unresolved.")
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(main())
