# Herramientas

## construir-offline.py

Empaqueta el juego entero en **un solo fichero HTML** que funciona sin conexión
y sin servidor: el código va concatenado (sin módulos, que el navegador bloquea
al abrir un fichero del disco), y las fuentes y los 318 sprites viajan dentro
como data URI.

Se ejecuta desde la carpeta `leyenda/`:

```sh
python3 herramientas/construir-offline.py
```

Deja el resultado en `/tmp/hazte-con-todos-offline.html` (~0,8 MB). Se abre con
doble clic y guarda las partidas igual que la versión web, en su navegador.
