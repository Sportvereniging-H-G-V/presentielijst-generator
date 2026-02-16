#!/usr/bin/env python3
"""
Script om CHANGELOG.md bij te werken bij een release.
Vervangt [Unreleased] met [VERSION] - DATE en voegt nieuwe [Unreleased] sectie toe.
"""
import re
import os
import sys

def update_changelog(version: str, today: str):
    """Update CHANGELOG.md met nieuwe versie."""
    with open('CHANGELOG.md', 'r', encoding='utf-8') as f:
        content = f.read()

    # Vervang [Unreleased] met versie en datum
    content = re.sub(
        r'^## \[Unreleased\]',
        f'## [{version}] - {today}',
        content,
        flags=re.MULTILINE
    )

    # Voeg nieuwe [Unreleased] sectie toe direct na de nieuwe versie sectie
    unreleased_section = '''

## [Unreleased]

### Toegevoegd

### Gewijzigd

### Verwijderd

'''

    # Zoek de nieuwe versie sectie en voeg [Unreleased] toe direct erna
    pattern = rf'^## \[{re.escape(version)}\] - {re.escape(today)}'
    match = re.search(pattern, content, re.MULTILINE)
    if match:
        # Vind het einde van de huidige sectie (volgende ## of einde bestand)
        start_pos = match.end()
        next_section = re.search(r'^## \[', content[start_pos:], re.MULTILINE)
        if next_section:
            insert_pos = start_pos + next_section.start()
        else:
            insert_pos = len(content)
        
        # Voeg de nieuwe sectie toe
        content = content[:insert_pos] + unreleased_section + content[insert_pos:]

    with open('CHANGELOG.md', 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✅ CHANGELOG.md bijgewerkt: [Unreleased] → [{version}] - {today}")

if __name__ == '__main__':
    version = os.environ.get('VERSION')
    today = os.environ.get('TODAY')
    
    if not version or not today:
        print("❌ Error: VERSION en TODAY environment variabelen zijn vereist")
        sys.exit(1)
    
    update_changelog(version, today)

