"""Builds data/restaurants.json from the official nutrition guides in data/src/.
Each item: {"n": name, "c": category, "s": [[size_label, kcal, fat, satfat, sodium_mg, carbs, fibre, sugar, protein], ...]}"""
import csv, json, re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent
SZ = {'S': 'Small', 'M': 'Medium', 'L': 'Large', 'X': 'Extra Large', 'R': 'Regular'}
num = lambda s: float(s) if s not in ('', None) else 0.0
def clean(v): return int(v) if v == int(v) else v

def tims():
    items, cat = [], ''
    for line in (ROOT / 'tim-hortons.txt').read_text().splitlines():
        if not line or line.startswith('# '): continue
        if line.startswith('#'): cat = line[1:].strip(); continue
        name, data = line.split('|', 1)
        sizes = []
        for part in data.split(';'):
            lab = ''
            if re.match(r'^[SMLXR]:', part): lab, part = SZ[part[0]], part[2:]
            vals = [clean(num(x)) for x in part.split(',')]
            sizes.append([lab or '1 item'] + vals)
        if cat.startswith('Timbits'): sizes[0][0] = '1 Timbit'
        if cat.startswith('Syrups'): sizes[0][0] = '1 pump'
        if cat.startswith('Omelette'): sizes[0][0] = '2 bites'
        items.append({'n': name, 'c': cat.replace(' (2 per serving)', '').replace(' (per pump)', '').replace(' (each)', ''), 's': sizes})
    return items

def canes():
    rows = [r for r in csv.DictReader(l for l in (ROOT / 'raising-canes.csv').read_text().splitlines() if not l.startswith('#'))]
    items, byname = [], {}
    for r in rows:
        vals = [clean(num(r[k])) for k in ('kcal', 'fat', 'satfat', 'sodium', 'carbs', 'fiber', 'sugar', 'protein')]
        m = re.match(r"^(.*) - (Kid's|Regular|Large)$", r['name'])
        if m:
            base = m.group(1)
            if base not in byname:
                byname[base] = {'n': base, 'c': r['category'], 's': []}; items.append(byname[base])
            byname[base]['s'].append([f"{m.group(2)} ({r['serving']})"] + vals)
        else:
            items.append({'n': r['name'], 'c': r['category'], 's': [[r['serving']] + vals]})
    return items

brands = [
    {'id': 'tim-hortons', 'name': 'Tim Hortons', 'aliases': ['tims', 'timmies', 'tim hortons', 'timhortons'], 'source': 'Tim Hortons Canada nutrition guide', 'asOf': 'July 2026', 'url': 'https://www.timhortons.ca/nutrition-and-allergens', 'items': tims()},
    {'id': 'raising-canes', 'name': "Raising Cane's", 'aliases': ['canes', 'raising canes', "cane's"], 'source': "Raising Cane's allergen & nutritional information", 'asOf': 'August 2026', 'url': 'https://www.raisingcanes.com/allergens/', 'items': canes()},
]
(ROOT.parent / 'restaurants.json').write_text(json.dumps({'fields': ['size', 'kcal', 'fat', 'satfat', 'sodium', 'carbs', 'fibre', 'sugar', 'protein'], 'brands': brands}, separators=(',', ':'), ensure_ascii=False))
for b in brands: print(b['name'], len(b['items']), 'items')
