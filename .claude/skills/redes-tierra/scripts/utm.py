#!/usr/bin/env python3
"""Genera los links con UTM para las redes de Tierra.

Sin UTM, el tráfico de redes llega a GA4 como "directo" y se pierde la
trazabilidad. Este script fuerza la convención de medicion.md.

Ejemplos:
    python3 utm.py --red instagram --ubicacion bio --campana perfil
    python3 utm.py --red tiktok --ubicacion dm --campana precios-mazunte --destino azimut
    python3 utm.py --todos          # los links de bio de todas las redes
"""

import argparse
import re
import sys
from urllib.parse import urlencode

BASE = "https://tierra.vip"

REDES = ["instagram", "tiktok", "youtube", "facebook"]
UBICACIONES = ["bio", "stories", "dm", "reel", "perfil"]

# Destinos válidos → ruta en el sitio. Las rutas limpias las resuelve Netlify.
DESTINOS = {
    "redes": "/redes",
    "home": "/",
    "azimut": "/azimut",
    "nabani": "/nabani",
    "aldea-tao": "/aldea-tao",
    "depas-kora": "/depas-kora",
    "serena": "/serena",
    "construccion": "/construccion",
    "nosotros": "/nosotros",
    "mazunte": "/terrenos-en-mazunte",
    "construir": "/construir-en-la-costa-de-oaxaca",
}

CAMPANA_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def construir(red, ubicacion, campana, destino):
    if red not in REDES:
        raise ValueError(f"red inválida: {red!r}. Válidas: {', '.join(REDES)}")
    if ubicacion not in UBICACIONES:
        raise ValueError(
            f"ubicación inválida: {ubicacion!r}. Válidas: {', '.join(UBICACIONES)}"
        )
    if destino not in DESTINOS:
        raise ValueError(
            f"destino inválido: {destino!r}. Válidos: {', '.join(DESTINOS)}"
        )
    if not CAMPANA_RE.match(campana):
        raise ValueError(
            f"campaña inválida: {campana!r}. Usa minúsculas y guiones, ej. precios-mazunte"
        )

    query = urlencode(
        {
            "utm_source": red,
            "utm_medium": ubicacion,
            "utm_campaign": campana,
        }
    )
    return f"{BASE}{DESTINOS[destino]}?{query}"


def main():
    p = argparse.ArgumentParser(description="Links con UTM para las redes de Tierra")
    p.add_argument("--red", choices=REDES, help="utm_source")
    p.add_argument("--ubicacion", choices=UBICACIONES, default="bio", help="utm_medium")
    p.add_argument("--campana", default="perfil", help="utm_campaign (minúsculas-con-guiones)")
    p.add_argument("--destino", choices=sorted(DESTINOS), default="redes")
    p.add_argument(
        "--todos", action="store_true", help="imprime el link de bio de cada red"
    )
    args = p.parse_args()

    try:
        if args.todos:
            for red in REDES:
                print(f"{red:10} {construir(red, 'bio', 'perfil', 'redes')}")
            return 0
        if not args.red:
            p.error("hace falta --red (o usa --todos)")
        print(construir(args.red, args.ubicacion, args.campana, args.destino))
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
