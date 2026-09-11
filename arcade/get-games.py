#!/usr/bin/env python3
"""
Downloads the 15 game folders for the site in site/.

They are not in the zip because they are about 210 MB of artwork and audio,
and the chat that delivered this folder caps attachments at 30 MB. Everything
else is already here.

Run this ONCE while you have internet:

    python3 get-games.py          (Mac/Linux)
    py -3 get-games.py            (Windows)

...or double-click GET-GAMES-Windows.bat / GET-GAMES-Mac-Linux.command.

After it finishes you never need a connection again: start the arcade with
START-Windows.bat or START-Mac-Linux.command and everything plays offline.

It fetches from the same public repositories the site already points at.
Safe to re-run: games you already have are skipped.
"""
import io
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile

GAMES = [
    "SlopeGame", "Cubefield", "Run3", "Vex3", "WorldsHardestGame",
    "IdleBreakout", "DoodleJump", "DriftBoss", "EggyCar", "TinyFishing",
    "BasketRandom", "Hanger", "BigTowerTinySquare", "IcyPurpleHead2",
    "AppleShooter",
]
OWNER = "ubg98"
BRANCHES = ("gh-pages", "main", "master")
DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "site", "g")


def have_git():
    try:
        subprocess.run(["git", "--version"], stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, check=True)
        return True
    except Exception:
        return False


def via_git(name, target):
    url = "https://github.com/%s/%s.git" % (OWNER, name)
    r = subprocess.run(["git", "clone", "--depth", "1", "-q", url, target],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if r.returncode != 0:
        return False
    shutil.rmtree(os.path.join(target, ".git"), ignore_errors=True)
    return True


def via_zip(name, target):
    """No git installed? Pull the repository's zip and unpack it."""
    for branch in BRANCHES:
        url = "https://codeload.github.com/%s/%s/zip/refs/heads/%s" % (OWNER, name, branch)
        try:
            with urllib.request.urlopen(url, timeout=90) as resp:
                blob = resp.read()
        except Exception:
            continue
        try:
            with zipfile.ZipFile(io.BytesIO(blob)) as z:
                root = z.namelist()[0].split("/")[0]
                tmp = target + ".tmp"
                shutil.rmtree(tmp, ignore_errors=True)
                z.extractall(tmp)
                shutil.move(os.path.join(tmp, root), target)
                shutil.rmtree(tmp, ignore_errors=True)
            return True
        except Exception:
            shutil.rmtree(target + ".tmp", ignore_errors=True)
            continue
    return False


def main():
    os.makedirs(DEST, exist_ok=True)
    git = have_git()
    print("")
    print("  Fetching %d games into site/g/" % len(GAMES))
    print("  Roughly 210 MB in total -- this takes a few minutes.")
    print("  Method: %s" % ("git" if git else "direct download (no git found)"))
    print("")

    done, failed = 0, []
    for i, name in enumerate(GAMES, 1):
        target = os.path.join(DEST, name)
        if os.path.isdir(target) and os.path.exists(os.path.join(target, "index.html")):
            print("  [%2d/%d] %-20s already here" % (i, len(GAMES), name))
            done += 1
            continue
        shutil.rmtree(target, ignore_errors=True)
        sys.stdout.write("  [%2d/%d] %-20s downloading... " % (i, len(GAMES), name))
        sys.stdout.flush()
        ok = (git and via_git(name, target)) or via_zip(name, target)
        if ok and os.path.exists(os.path.join(target, "index.html")):
            print("done")
            done += 1
        else:
            shutil.rmtree(target, ignore_errors=True)
            print("FAILED")
            failed.append(name)

    print("")
    print("  %d of %d games ready." % (done, len(GAMES)))
    if failed:
        print("  Could not fetch: %s" % ", ".join(failed))
        print("  Re-run this script to retry just those.")
    if done:
        print("")
        print("  Now start the arcade:")
        print("    Windows ....... START-Windows.bat")
        print("    Mac / Linux ... START-Mac-Linux.command")
    print("")
    return 0 if done else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n  Stopped. Re-run any time; finished games are kept.\n")
