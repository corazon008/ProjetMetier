# Colis Impossible — Bend 2

Le jeu original est réécrit : les règles, les idées de l'IA, le lecteur de
prompts et le vérificateur sont en Bend. La page ne fait que dessiner l'état
que Bend lui renvoie.

L'ancienne page HTML/JS est conservée dans `legacy/index.html`.

## Lancer

```bash
make            # check + preuve + autotest + bundle
make serve      # construit puis sert http://localhost:8000
```

## Commandes

```bash
make check      # bend main.bend --check-only
make proof      # bend PROOF.bend -> ALL PROOFS CHECK
make test       # les 21 idées + quelques déplacements
make build      # bend index.html -o dist
make serve      # build + python3 -m http.server
make run        # le petit CLI de main.bend
make clean
```

`bend` bundle lui-même la page et l'import `.bend` ; Bun n'est pas nécessaire
au runtime. Il faut simplement `bend` sur le PATH.

## Fichiers

```
main.bend       plateau, step, replay, portails, clés, objets,
                vérificateur BFS, 21 idées, lecteur de prompts, session
LAWS.bend       colis_jamais_livre : pour toute suite de déplacements,
                le plateau de départ ne livre jamais le colis
PROOF.bend      l'invariant, chk_all sur les 16 x 10 cases, run_safe
selftest.bend   toutes les idées : premier patch refusé, correctif accepté
index.html      la page (CSS et décor d'origine)
main.js         rendu canvas, journal, animations, clavier uniquement
legacy/         l'ancienne version HTML/JS, intacte
dist/           généré par `make build`
```

## Ce qui est réel

- `make proof` vérifie une preuve mathématique pour le **plateau de départ** :
  la loi est remplie par `PROOF.bend`, `chk_all` énumère les 16 × 10 cases et
  les quatre directions, `run_safe` la transporte sur n'importe quelle suite
  de déplacements.
- Chaque modification proposée par l'IA est vérifiée à l'exécution par un
  parcours en largeur écrit en Bend (position + clé, au plus 320 états). Le
  BFS donne aussi les cases atteignables pour l'animation et le trajet
  contre-exemple pour le fantôme.
- Les correctifs ne sont pas prouvés un par un : ils sont vérifiés par le BFS.
  La page le dit dans la section « Ce que ce jeu fait vraiment ».

L'IA est simulée : `main.bend` reconnaît des mots-clés, sans modèle de
langage. Les réponses et les patches sont des données. Les chips appellent une
idée par son identifiant, donc chaque idée reste accessible même si une phrase
de prompt est ambiguë.

Testé avec Bend 2.0.40.
