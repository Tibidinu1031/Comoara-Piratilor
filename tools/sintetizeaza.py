"""Sintetizează audio/<amprentă>.mp3 pentru fiecare text din tools/texte-narate.json.

Folosește vocile neurale Microsoft prin edge-tts (gratuit, fără cheie). Nu se
apelează direct: rulează  node tools/genereaza-audio.mjs  care produce mai întâi
lista de texte. Fișierele existente nu se regenerează; cele fără text se șterg.
La final scrie audio/manifest.js: { amprentă: durata în secunde }."""
import argparse, asyncio, json, os, sys

# consola Windows e cp1252 și nu poate afișa diacriticele din mesaje
for flux in (sys.stdout, sys.stderr):
    if hasattr(flux, "reconfigure"):
        flux.reconfigure(encoding="utf-8", errors="replace")

try:
    import edge_tts
    from mutagen.mp3 import MP3
except ImportError:
    sys.exit("lipsesc pachetele: python -m pip install edge-tts mutagen")

RAD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(RAD, "audio")
TEXTE = os.path.join(RAD, "tools", "texte-narate.json")


async def sintetizeaza(sem, voce, rata, h, text):
    cale = os.path.join(AUDIO, h + ".mp3")
    async with sem:
        for incercare in range(4):
            try:
                await edge_tts.Communicate(text, voce, rate=rata).save(cale)
                if os.path.getsize(cale) > 0:
                    return True
            except Exception as e:  # rețea / serviciu ocupat: reîncercăm
                print(f"  ! {h}: {e} (încercarea {incercare + 1})")
            await asyncio.sleep(2 * (incercare + 1))
    if os.path.exists(cale):
        os.remove(cale)
    return False


async def principal(voce, rata, paralel):
    with open(TEXTE, encoding="utf-8") as f:
        texte = json.load(f)
    os.makedirs(AUDIO, exist_ok=True)

    lipsa = [h for h in texte if not os.path.exists(os.path.join(AUDIO, h + ".mp3"))]
    print(f"{len(texte)} texte, {len(lipsa)} de generat cu {voce} (rata {rata})")
    sem = asyncio.Semaphore(paralel)
    rez = await asyncio.gather(*(sintetizeaza(sem, voce, rata, h, texte[h]) for h in lipsa))
    esuate = [h for h, ok in zip(lipsa, rez) if not ok]
    for h in esuate:
        print(f"  ✗ nu am putut genera {h}: {texte[h][:60]}")

    for nume in os.listdir(AUDIO):
        if nume.endswith(".mp3") and nume[:-4] not in texte:
            os.remove(os.path.join(AUDIO, nume))
            print(f"  – șters (fără text): {nume}")

    manifest = {}
    for h in texte:
        cale = os.path.join(AUDIO, h + ".mp3")
        if os.path.exists(cale):
            manifest[h] = round(MP3(cale).info.length, 2)
    with open(os.path.join(AUDIO, "manifest.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("/* generat de tools/genereaza-audio.mjs — voce " + voce + ", rata " + rata + " */\n")
        f.write("var NAR_MANIFEST=" + json.dumps(manifest, separators=(",", ":"), sort_keys=True) + ";\n")
    total = sum(manifest.values())
    print(f"manifest: {len(manifest)} înregistrări, {total / 60:.1f} minute de audio")
    return 1 if esuate else 0


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--voce", default="ro-RO-AlinaNeural", help="ro-RO-AlinaNeural (femeie) sau ro-RO-EmilNeural (bărbat)")
    p.add_argument("--rata", default="-5%", help="viteza, ex. -5%% sau +0%%")
    p.add_argument("--paralel", type=int, default=4)
    a = p.parse_args()
    sys.exit(asyncio.run(principal(a.voce, a.rata, a.paralel)))
