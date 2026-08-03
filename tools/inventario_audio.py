#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extrae TODAS las cadenas japonesas que la app llega a pronunciar.

Replica exactamente lo que pasan a hablar() los distintos módulos (ver los
comentarios de cada bloque), para poder pre-generar su audio. Si un texto no
está en el inventario, la app simplemente cae a la voz del navegador, así que
sobrar es inofensivo y faltar tampoco rompe nada.

Uso:  python3 tools/inventario_audio.py [salida.json]
"""
import json
import re
import sys

TIENE_JAPONES = re.compile(r'[぀-ヿ一-鿿]')


def cargar(ruta):
    try:
        with open(ruta, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return None


def main(salida='data/audio/manifest.json'):
    textos = []
    vistos = set()

    def add(*valores):
        for t in valores:
            if not t:
                continue
            t = str(t).strip()
            if not t or t in vistos or not TIENE_JAPONES.search(t):
                continue
            vistos.add(t)
            textos.append(t)

    # --- contenido_japones.json ---
    # review.js / vocabulario.js / lecciones.js hablan `reading || kanji` de
    # cada vocab, y `answer` de cada conjugación.
    contenido = cargar('contenido_japones.json') or {}
    for t in contenido.get('tarjetas', []):
        tipo = t.get('type', 'vocab')
        if tipo == 'conj':
            add(t.get('answer'), *(t.get('alt') or []))
        elif tipo != 'grammar':
            add(t.get('reading'), t.get('kanji'))

    # --- data/kanji.json ---
    # kanji.js habla `kun[0] || on[0] || kanji`; añadimos también las palabras
    # de ejemplo, que son candidatas naturales a tener botón de audio.
    kanji = cargar('data/kanji.json') or {}
    for k in kanji.get('kanji', []):
        kun, on = k.get('kun') or [], k.get('on') or []
        add(kun[0] if kun else (on[0] if on else k['kanji']))
        for e in k.get('ejemplos', []):
            add(e.get('lectura'), e.get('palabra'))
        # Frases de ejemplo de la pestaña de Kanji (llevan botón de audio).
        for f in k.get('frases', []):
            add(f.get('ja'))

    # --- data/teoria.json ---
    # Los ejemplos de cada punto gramatical llevan botón de audio.
    teoria = cargar('data/teoria.json') or {}
    for puntos in (teoria.get('lecciones') or {}).values():
        for pt in puntos:
            for e in pt.get('ejemplos', []):
                add(e.get('ja'))

    # --- bancos de ejercicios ---
    ej_base = cargar('data/ejercicios.json') or {}
    ej_cur = cargar('data/ejercicios_japones.json') or {}
    ej_ex = cargar('data/ejercicios_examen_japones.json') or {}

    # ordenar: lecciones.js habla tokens.join('')
    for e in (ej_base.get('ordenar') or []) + (ej_cur.get('ordenar') or []):
        toks = e.get('palabras') or e.get('tokens') or []
        add(''.join(toks))
        add(''.join(e.get('kana') or []))

    # escritura / traduccion / voz / produccion_larga
    for e in (ej_cur.get('escritura') or []):
        add(*(e.get('respuestas') or []))
    for e in (ej_base.get('traduccion') or []) + (ej_cur.get('traduccion') or []):
        add(*(e.get('respuestas') or []))
    for e in (ej_cur.get('voz') or []):
        add(e.get('objetivo'), *(e.get('respuestas') or []))
    for e in (ej_cur.get('produccion_larga') or []):
        add(e.get('ejemplo_respuesta') or e.get('ejemplo'))

    # particulas / bunpo_choice: se pronuncia la frase con el hueco resuelto
    def resolver_hueco(frase, respuesta):
        if not frase:
            return None
        r = '' if str(respuesta).startswith('∅') else respuesta
        return re.sub(r'[_＿]+', r, frase)

    for e in (ej_base.get('particulas') or []) + (ej_cur.get('particulas') or []):
        add(resolver_hueco(e.get('frase_con_hueco') or e.get('frase'),
                           e.get('respuesta') or e.get('correcta')))
    for e in (ej_ex.get('bunpo_choice') or []):
        add(resolver_hueco(e.get('frase_con_hueco'), e.get('respuesta')))

    # texto_gramatica: frase final con el hueco resuelto
    for g in (ej_ex.get('texto_gramatica') or []):
        partes = g.get('partes') or []
        hi = g.get('huecoIdx')
        add(''.join(g['respuesta'] if i == hi else p.get('t', '')
                    for i, p in enumerate(partes)))

    # texto_error: la versión corregida y las frases correctas
    for e in (ej_ex.get('texto_error') or []):
        add(e.get('correcta'))
        for i, c in enumerate(e.get('candidatos') or []):
            if i != e.get('incorrectaIdx'):
                add(c)

    # lectura_parrafo: shadowing trocea el texto por 。
    for p in (ej_ex.get('lectura_parrafo') or []):
        for frase in (p.get('texto') or '').split('。'):
            frase = frase.strip()
            if frase:
                add(frase + '。')

    print(f'{len(textos)} textos únicos')
    largos = sorted(textos, key=len, reverse=True)[:3]
    print('más largos:', [f'{len(t)} car.' for t in largos])
    print('longitud media:', round(sum(len(t) for t in textos) / max(len(textos), 1), 1), 'caracteres')

    if salida != '-':
        import os
        os.makedirs(os.path.dirname(salida), exist_ok=True)
        with open(salida, 'w', encoding='utf-8') as f:
            json.dump(textos, f, ensure_ascii=False)
        print('escrito en', salida)
    return textos


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'data/audio/manifest.json')
