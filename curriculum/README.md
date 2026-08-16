# Currículums — Juan Benítez López

Seis CVs listos para la campaña de septiembre de 2026, cada uno en **DOCX** (editable y
compatible con lectores ATS de portales corporativos) y **PDF** (para enviar por email).

| # | Archivo | Para qué vacantes |
|---|---------|-------------------|
| 1 | `CV_JuanBenitez_1_DesarrolloNegocio` | Multinacionales españolas, área internacional: Iberdrola, Acciona, Alstom, Amadeus, Cellnex, Naturgy, Talgo, Schneider. |
| 2 | `CV_JuanBenitez_2_DefensaAeroespacial` | Defensa y aeroespacial: Indra, GMV, Sener, EM&E, Navantia, PLD Space, ITP Aero, TEDAE. |
| 3 | `CV_JuanBenitez_3_ComercioExterior` | Asociaciones sectoriales y cámaras bilaterales: FIAB, TEDAE, FICE, ASCER, ANIEME, Interporc, Cámara Italiana. |
| 4 | `CV_JuanBenitez_4_Instituciones` | Sector público y diplomacia económica: ICEX, CDTI, COFIDES, CESCE, Invest in Madrid, agencias autonómicas. |
| 5 | `CV_JuanBenitez_5_DigitalProducto` | Producto digital, growth y datos. El proyecto propio va en cabecera. |
| 6 | `CV_JuanBenitez_6_InternationalBD_EN` | Cualquier proceso en inglés: multinacionales, EMEA, instituciones europeas. |

## Regenerar

Todo el contenido vive en `content_part.py`; `engine.py` lo pinta en DOCX y PDF a la vez.

```bash
pip install python-docx
python3 build.py        # escribe los 12 archivos en ./out
```

El PDF se genera con Chromium headless (`engine.py` → `CHROMIUM`), no con LibreOffice.
