#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Crea tarjetas de vocabulario nuevas a partir de una tabla de traducciones.

Se apoya en dos cosas:
  - una lista de palabras que faltan por lección (kana/kanji/categoría), que es
    dato factual del temario;
  - un diccionario kana -> español escrito a mano por nosotros.

Las series mecánicas (horas, minutos, meses, días del mes) se generan por regla
en vez de traducirlas una a una, que es más fiable y menos tedioso.

No pisa nada: si una palabra ya existe en contenido_japones.json (por lectura o
por forma escrita), se salta.
"""
import hashlib
import json
import re
import sys

HORAS = {1: 'la una', 2: 'las dos', 3: 'las tres', 4: 'las cuatro', 5: 'las cinco',
         6: 'las seis', 7: 'las siete', 8: 'las ocho', 9: 'las nueve', 10: 'las diez',
         11: 'las once', 12: 'las doce'}
MESES = {1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril', 5: 'mayo', 6: 'junio',
         7: 'julio', 8: 'agosto', 9: 'septiembre', 10: 'octubre', 11: 'noviembre',
         12: 'diciembre'}
NUM_KANJI = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8,
             '九': 9, '十': 10}


def num_de(kanji):
    """Lee un número escrito en kanji (hasta 99)."""
    if not kanji:
        return None
    m = re.match(r'^([一二三四五六七八九十]+)', kanji)
    if not m:
        return None
    s, total, prev = m.group(1), 0, 0
    if s == '十':
        return 10
    for ch in s:
        v = NUM_KANJI[ch]
        if v == 10:
            prev = (prev or 1) * 10
        else:
            prev += v
    return prev or None


def automatico(kana, kanji, en):
    """Devuelve la traducción de las series mecánicas, o None si no aplica."""
    n = num_de(kanji)
    if n is None:
        return None
    if kanji.endswith('時') and 'o’clock' in en:
        return HORAS.get(n)
    if kanji.endswith('分') and 'minute' in en:
        return f'{n} minuto' + ('' if n == 1 else 's')
    if kanji.endswith('月') and 'n.' and en.strip() in MESES.values() or \
       (kanji.endswith('月') and en.strip().lower() in [m.lower() for m in
        ['January', 'February', 'March', 'April', 'May', 'June', 'July',
         'August', 'September', 'October', 'November', 'December']]):
        return MESES.get(n)
    if kanji.endswith('日') and 'day of a month' in en:
        return f'día {n} del mes'
    return None


def limpiar(s):
    return re.sub(r'[（(].*?[)）]', '', s or '').replace('＋ negative', '').strip()


def clave(kana, kanji):
    return hashlib.sha1(f'{kana}|{kanji}'.encode()).hexdigest()[:8]


def norm(s):
    if not s:
        return ''
    s = re.sub(r'[（(].*?[)）]', '', s)
    s = s.replace('～', '').replace('〜', '').strip()
    return re.sub(r'(ます|ました|ません|です|する)$', '', s)


def main(faltan_json, es_modulo, lecciones, salida='contenido_japones.json'):
    sys.path.insert(0, '/tmp/vv')
    ES = __import__(es_modulo).ES
    faltan = json.load(open(faltan_json, encoding='utf-8'))
    doc = json.load(open(salida, encoding='utf-8'))

    # Se guardan las formas normalizadas Y las literales: hay palabras como する
    # cuya forma normalizada queda vacía y que si no se colarían por duplicado.
    ya = set()
    for c in doc['tarjetas']:
        if c.get('type') in ('grammar', 'conj'):
            continue
        for f in (c.get('kanji'), c.get('reading')):
            for v in (norm(f), f):
                if v:
                    ya.add(v)

    nuevas, sin_es, i = [], [], 0
    for L in lecciones:
        for w in faltan[str(L)]:
            kana, kanji, en = w['kana'], w['kanji'], w['en']
            if ({norm(kana), norm(kanji), kana, kanji} - {''}) & ya:
                continue
            # Lecturas alternativas separadas por /. Se limpia antes de partir:
            # hay entradas como 降る（雨/雪が）donde la barra va dentro del
            # paréntesis y no separa lecturas.
            alt = None
            kana = limpiar(kana)
            if '/' in kana:
                partes = [p.strip() for p in kana.split('/')]
                kana, alt = partes[0], partes[1:]
            es = automatico(kana, kanji, en) or ES.get(f'{w["kana"]}|{kanji}') or ES.get(w['kana'])
            if not es:
                sin_es.append((w['kana'], kanji, en))
                continue
            escrito = kanji or kana
            card = {'id': f'gk_{clave(w["kana"], kanji)}', 'l': f'L{L}',
                    'kanji': escrito, 'reading': kana, 'es': es,
                    'dir': 'es-jp' if i % 5 < 3 else 'jp-es'}
            if alt:
                card['readingAlt'] = alt
            nuevas.append(card)
            # Ojo: solo formas no vacías. Palabras como する normalizan a cadena
            # vacía, y meterla aquí haría que se saltaran todas las palabras sin
            # kanji que vinieran detrás.
            for f in (norm(kana), norm(escrito), kana, escrito):
                if f:
                    ya.add(f)
            i += 1

    print(f'{len(nuevas)} tarjetas nuevas')
    if sin_es:
        print(f'SIN TRADUCIR ({len(sin_es)}):')
        for k, kj, en in sin_es[:40]:
            print(f'   {k}|{kj}|{en}')
        return 1

    doc['tarjetas'].extend(nuevas)
    json.dump(doc, open(salida, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    open(salida, 'a', encoding='utf-8').write('\n')
    print('escrito en', salida, '| total tarjetas:', len(doc['tarjetas']))
    return 0


if __name__ == '__main__':
    lec = [int(x) for x in sys.argv[3].split(',')]
    sys.exit(main(sys.argv[1], sys.argv[2], lec))
