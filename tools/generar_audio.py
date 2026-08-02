#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pre-genera el audio japonés de la app con VOICEVOX.

Esto es un paso de construcción que se ejecuta A MANO de vez en cuando, no
algo que corra en el navegador: produce los .mp3 que luego se sirven estáticos
desde data/audio/. Si un texto no tiene audio, la app cae automáticamente a la
voz del navegador, así que regenerar es siempre opcional e incremental.

Requisitos (una sola vez):

    # 1. Motor VOICEVOX (wheel con los modelos incluidos)
    curl -L -o voicevox_core-0.15.7+cpu-cp38-abi3-linux_x86_64.whl \\
      https://github.com/VOICEVOX/voicevox_core/releases/download/0.15.7/voicevox_core-0.15.7+cpu-cp38-abi3-linux_x86_64.whl
    python3 -m venv venv && ./venv/bin/pip install \\
      ./voicevox_core-0.15.7+cpu-cp38-abi3-linux_x86_64.whl imageio-ffmpeg

    # 2. onnxruntime 1.13.1 y diccionario Open JTalk
    curl -L -o onnx.tgz https://github.com/microsoft/onnxruntime/releases/download/v1.13.1/onnxruntime-linux-x64-1.13.1.tgz
    curl -L -o ojt.tar.gz https://github.com/r9y9/open_jtalk/releases/download/v1.11.1/open_jtalk_dic_utf_8-1.11.tar.gz
    tar xzf onnx.tgz && tar xzf ojt.tar.gz

Uso:

    export LD_LIBRARY_PATH=$PWD/onnxruntime-linux-x64-1.13.1/lib:$LD_LIBRARY_PATH
    ./venv/bin/python tools/generar_audio.py --dic ./open_jtalk_dic_utf_8-1.11

Solo genera lo que falte; para rehacerlo todo, borra data/audio/.

LICENCIA: el audio lo genera VOICEVOX y su uso obliga a acreditar al personaje
(se hace en la propia app, en la pestaña de Shadowing y en el README).
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor

SALIDA = 'data/audio'
# 四国めたん ノーマル: voz femenina clara y de dicción estándar, la más neutra
# del set para estudiar. Cambiar el id implica regenerar todo el audio.
VOZ_ID = 2
VOZ_NOMBRE = '四国めたん'
CREDITO = 'VOICEVOX:四国めたん'

_core = None
_ffmpeg = None


def nombre_archivo(texto):
    """Nombre estable derivado del propio texto (no del orden del inventario)."""
    h = hashlib.sha1(texto.encode('utf-8')).hexdigest()[:12]
    return f'{h[:2]}/{h}.mp3'


def _init(dic):
    global _core, _ffmpeg
    from voicevox_core import VoicevoxCore, AccelerationMode
    import imageio_ffmpeg
    _core = VoicevoxCore(acceleration_mode=AccelerationMode.CPU, open_jtalk_dict_dir=dic)
    _core.load_model(VOZ_ID)
    _ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()


def _generar(args):
    texto, ruta = args
    try:
        wav = _core.tts(texto, VOZ_ID)
        os.makedirs(os.path.dirname(ruta), exist_ok=True)
        # mp3 mono 48kbps: compatible con todos los navegadores (incluido iOS)
        # y suficiente de sobra para voz.
        p = subprocess.run(
            [_ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
             '-f', 'wav', '-i', 'pipe:0',
             '-codec:a', 'libmp3lame', '-b:a', '48k', '-ac', '1', ruta],
            input=wav, capture_output=True)
        if p.returncode != 0:
            return texto, False, p.stderr.decode()[:200]
        return texto, True, ''
    except Exception as e:  # una frase rota no debe tumbar toda la tanda
        return texto, False, str(e)[:200]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dic', help='directorio del diccionario Open JTalk')
    ap.add_argument('--procesos', type=int, default=max(1, (os.cpu_count() or 2)))
    ap.add_argument('--limite', type=int, default=0, help='solo los N primeros (para probar)')
    ap.add_argument('--solo-manifiesto', action='store_true',
                    help='no sintetiza nada: solo rehace el índice con lo que ya hay en disco')
    args = ap.parse_args()
    if not args.solo_manifiesto and not args.dic:
        ap.error('hace falta --dic (o usa --solo-manifiesto)')

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from inventario_audio import main as inventario
    textos = inventario('-')
    if args.limite:
        textos = textos[:args.limite]

    mapa = {t: nombre_archivo(t) for t in textos}
    pendientes = [] if args.solo_manifiesto else [
        (t, os.path.join(SALIDA, n)) for t, n in mapa.items()
        if not os.path.exists(os.path.join(SALIDA, n))]
    print(f'{len(textos)} textos, {len(pendientes)} por generar '
          f'({len(textos) - len(pendientes)} ya estaban)')

    fallos = []
    if pendientes:
        hechos = 0
        with ProcessPoolExecutor(max_workers=args.procesos,
                                 initializer=_init, initargs=(args.dic,)) as ex:
            for texto, ok, err in ex.map(_generar, pendientes, chunksize=4):
                hechos += 1
                if not ok:
                    fallos.append((texto, err))
                if hechos % 100 == 0 or hechos == len(pendientes):
                    print(f'  {hechos}/{len(pendientes)}', flush=True)

    # El manifiesto solo lista lo que existe de verdad en disco.
    real = {t: n for t, n in mapa.items() if os.path.exists(os.path.join(SALIDA, n))}
    with open(os.path.join(SALIDA, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump({'voz': VOZ_NOMBRE, 'credito': CREDITO, 'formato': 'mp3',
                   'archivos': real}, f, ensure_ascii=False)

    total = sum(os.path.getsize(os.path.join(SALIDA, n)) for n in real.values())
    print(f'\n{len(real)} audios en disco, {total/1e6:.1f} MB')
    if fallos:
        print(f'{len(fallos)} fallos:')
        for t, e in fallos[:10]:
            print('  -', t[:40], '->', e)
    return 1 if fallos else 0


if __name__ == '__main__':
    sys.exit(main())
