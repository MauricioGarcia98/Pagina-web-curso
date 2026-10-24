"""Agrega a las lecciones las piezas del estándar (docs/estandar-lecciones.md).

Uso: python3 tools/enriquecer.py <modulo> <archivo_de_piezas>

El archivo de piezas tiene un bloque por lección:

    @@ 03-where
    objetivos: Filtrar filas con WHERE | Combinar condiciones con AND, OR y NOT
    prerrequisitos: sql-select
    autoevaluacion: ¿Puedes …? | ¿Sabes …?
    >> escenario
    Texto del caso (markdown).
    >> errores
    …
    >> trabajo
    …
    >> entrevista Título opcional
    …

- Las claves del front matter se reemplazan si ya existían.
- "escenario" va al principio de la lección; "errores", "trabajo" y "entrevista"
  van antes de "## Resumen" (o antes de los ejercicios si no hay resumen).
- Es idempotente: si la lección ya tiene un bloque del mismo tipo agregado por
  este script, lo reemplaza.
"""
import re
import sys
from pathlib import Path

MARCA = '<!-- estandar:{} -->'


def leer_piezas(texto):
    piezas = {}
    for bloque in re.split(r'^@@ ', texto, flags=re.M)[1:]:
        nombre, _, resto = bloque.partition('\n')
        meta, secciones = {}, []
        actual = None
        for linea in resto.split('\n'):
            m = re.match(r'^>> (\w+)\s*(.*)$', linea)
            if m:
                actual = [m.group(1), m.group(2).strip(), []]
                secciones.append(actual)
            elif actual is None:
                mm = re.match(r'^(\w+):\s*(.*)$', linea)
                if mm:
                    meta[mm.group(1)] = mm.group(2).strip()
            else:
                actual[2].append(linea)
        piezas[nombre.strip()] = (meta, [(k, t, '\n'.join(c).strip()) for k, t, c in secciones])
    return piezas


def quitar_bloque(cuerpo, tipo):
    return re.sub(r'\n?' + re.escape(MARCA.format(tipo)) + r'\n:::' + tipo + r'[^\n]*\n[\s\S]*?\n:::\n', '\n', cuerpo)


def aplicar(path, meta, secciones):
    s = path.read_text()
    m = re.match(r'---\n([\s\S]*?)\n---\n', s)
    fm, cuerpo = m.group(1), s[m.end():]
    for k, v in meta.items():
        if re.search(r'^' + k + r':', fm, flags=re.M):
            fm = re.sub(r'^' + k + r':.*$', lambda _: f'{k}: {v}', fm, flags=re.M)
        else:
            fm += f'\n{k}: {v}'
    for tipo, titulo, texto in secciones:
        cuerpo = quitar_bloque(cuerpo, tipo)
        bloque = f'{MARCA.format(tipo)}\n:::{tipo}{" " + titulo if titulo else ""}\n{texto}\n:::\n'
        if tipo == 'escenario':
            cuerpo = '\n' + bloque + cuerpo.lstrip('\n')
            continue
        idx = None
        for patron in (r'^## Resumen', r'^## Ejercicio', r'^:::ejercicio'):
            mm = re.search(patron, cuerpo, flags=re.M)
            if mm:
                idx = mm.start()
                break
        if idx is None:
            cuerpo = cuerpo.rstrip('\n') + '\n\n' + bloque
        else:
            cuerpo = cuerpo[:idx] + bloque + '\n' + cuerpo[idx:]
    path.write_text(f'---\n{fm}\n---\n' + cuerpo)


def main():
    modulo, archivo = sys.argv[1], sys.argv[2]
    raiz = Path(__file__).resolve().parent.parent / 'content' / modulo
    piezas = leer_piezas(Path(archivo).read_text())
    for nombre, (meta, secciones) in piezas.items():
        path = raiz / f'{nombre}.md'
        if not path.exists():
            sys.exit(f'No existe {path}')
        aplicar(path, meta, secciones)
        print(f'✔ {modulo}/{nombre}: {len(meta)} metadatos, {len(secciones)} bloques')


if __name__ == '__main__':
    main()
