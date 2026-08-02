#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Comprueba la cobertura y la integridad de data/kanji.json.

Verifica que estén TODOS los kanji de N5 y N4, que cada uno tenga su SVG de
trazo en data/kanjivg/, y que no falte ningún campo. Se ejecuta desde la raíz
del repo:

    python3 tools/comprobar_kanji.py

Salida distinta de 0 si falta algo, para poder usarlo en CI si algún día hace
falta.
"""
import json
import os
import sys

# Qué kanji entran en cada nivel del JLPT es información pública sobre el
# examen, no contenido de ningún libro.
N5 = ("日一国人年大十二本中長出三時行見月分後前生五間上東四今金九入学高円子外八六下来気小七山"
      "話女北午百書先名川千水半男西電校語土木聞食車何南万毎白天母火右読友左休父雨")

N4 = ("会同事自社発者地業方新場員立開手力問代明動京目通言理体田主題意不作用度強公持野以思家世多"
      "正安院心界教文元重近考画海売知道集別物使品計死特私始朝運終台広住無真有口少町料工建空急止"
      "送切転研足究楽起着店病質待試族銀早映親験英医仕去味写字答夜音注帰古歌買悪図週室歩風紙黒花"
      "春赤青館屋色走秋夏習駅洋旅服夕借曜飲肉貸堂鳥飯勉冬昼茶弟牛魚兄犬妹姉漢")


def dedup(s):
    visto, out = set(), []
    for ch in s:
        if ch not in visto:
            visto.add(ch)
            out.append(ch)
    return out


def main():
    n5 = dedup(N5)
    n4 = [k for k in dedup(N4) if k not in set(n5)]

    with open('data/kanji.json', encoding='utf-8') as f:
        datos = json.load(f)
    entradas = datos['kanji']
    por_kanji = {k['kanji']: k for k in entradas}

    fallos = []

    for nivel, lista in (('N5', n5), ('N4', n4)):
        faltan = [k for k in lista if k not in por_kanji]
        if faltan:
            fallos.append(f'{nivel}: faltan {len(faltan)}/{len(lista)} -> {"".join(faltan)}')
        else:
            print(f'{nivel}: {len(lista)}/{len(lista)} ✓')

    # Nivel mal etiquetado (afecta a los contadores de cobertura de la pestaña).
    s5, s4 = set(n5), set(n4)
    for k in entradas:
        esperado = 'N5' if k['kanji'] in s5 else 'N4' if k['kanji'] in s4 else 'Extra'
        if k['nivel'] != esperado:
            fallos.append(f'{k["kanji"]}: nivel {k["nivel"]}, debería ser {esperado}')

    # Campos obligatorios y SVG de trazo.
    ids = set()
    for k in entradas:
        if k['id'] in ids:
            fallos.append(f'{k["kanji"]}: id duplicado {k["id"]}')
        ids.add(k['id'])
        if not k.get('significado'):
            fallos.append(f'{k["kanji"]}: sin significado')
        if not k.get('on') and not k.get('kun'):
            fallos.append(f'{k["kanji"]}: sin ninguna lectura')
        if not k.get('mnemonico'):
            fallos.append(f'{k["kanji"]}: sin mnemotecnia')
        if not k.get('ejemplos'):
            fallos.append(f'{k["kanji"]}: sin ejemplos')
        cp = format(ord(k['kanji']), '05x')
        if not os.path.exists(f'data/kanjivg/{cp}.svg'):
            fallos.append(f'{k["kanji"]}: falta data/kanjivg/{cp}.svg')

    objetivo = datos.get('meta', {}).get('objetivo', {})
    if objetivo.get('N5') != len(n5) or objetivo.get('N4') != len(n4):
        fallos.append(f'meta.objetivo {objetivo} no cuadra con N5={len(n5)} N4={len(n4)}')

    print(f'total en kanji.json: {len(entradas)}')
    if fallos:
        print(f'\n{len(fallos)} problema(s):')
        for f_ in fallos:
            print(' -', f_)
        return 1
    print('todo correcto ✓')
    return 0


if __name__ == '__main__':
    sys.exit(main())
