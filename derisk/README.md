# Dé-risquage — le control pass greybox → modèle vidéo

Harnais jetable, écrit la veille du Generathon pour répondre à **la seule question qui peut tuer
Découpage** :

> Est-ce qu'une passe depth **synthétique** (WebGL, propre, sans grain, sans éclairage réel) pilote
> correctement un modèle vidéo — et est-ce que trois caméras posées sur le même beat reviennent
> assez cohérentes pour être **montées ensemble** ?

Tous les workflows publics partent de rendus **Blender** (matériaux, lumière, antialiasing). Personne
ne documente ce que donne une depth WebGL brute. Si la réponse est non, il faut le savoir samedi à
10 h 30, pas dimanche à 2 h.

---

## Ce que ça fait

`scene.html` — un plateau greybox en Three.js : une pièce, une table, deux acteurs. Trois caméras
sur **le même beat de 3 s** :

| Caméra | Focale | Mouvement |
|---|---|---|
| `wide` | 35 mm | dolly avant lent, les deux acteurs dans le cadre |
| `close` | 85 mm | single sur A, légère poussée |
| `reverse` | 85 mm | contrechamp sur B |

Les trois restent **du même côté de la ligne d'action** (l'axe A↔B) — la règle des 180°. C'est
mécaniquement pour ça qu'elles peuvent raccorder.

Chaque caméra sort deux passes :

- **depth** — profondeur linéaire view-space, normalisée sur un near/far **fixe** et inversée
  (proche = blanc). Convention MiDaS, celle qu'attendent ControlNet et VACE. La normalisation fixe
  plutôt qu'automatique par frame est délibérée : l'auto-normalisation fait scintiller la depth, et
  le modèle vidéo lit ce scintillement comme du mouvement.
- **beauty** — greybox mat ombré, meilleure référence de mouvement pour Seedance.

## Lancer

```bash
cd derisk
npm install
node render.mjs                 # → out/{wide,close,reverse}_{depth,beauty}.mp4
```

Le rendu est headless (Chromium + WebGL SwiftShader), ~2 min pour les 6 clips. Sur une machine avec
un vrai GPU, ajouter `CHROMIUM_PATH=/chemin/vers/chrome` si besoin.

```bash
export FAL_KEY=...
node fal_smoke.mjs probe        # dump le schéma d'entrée réel de l'endpoint
node fal_smoke.mjs run          # les 3 caméras via Wan VACE depth (~0,12 $ le lot)
node fal_smoke.mjs run --seedance
```

**Fais `probe` en premier.** Les noms de champs dans `payload()` sont une hypothèse tirée de la doc ;
`probe` imprime le schéma réel de l'endpoint. En cas d'erreur, fal renvoie un 422 qui liste les champs
attendus — le script l'affiche verbatim.

## ⚠️ fal est bloqué depuis ce conteneur

`fal.ai` et `queue.fal.run` sont refusés par la politique de sortie réseau de cette session
(`CONNECT tunnel failed, 403`). **Le rendu marche ici, l'appel fal doit être lancé depuis ta
machine.** Rien à débloquer côté code — juste à exécuter ailleurs.

## Lire le résultat

Ce qu'on regarde, dans l'ordre :

1. **La géométrie est-elle respectée ?** La table est-elle là où elle est dans le greybox, le
   mouvement de caméra est-il celui qu'on a posé ?
2. **Est-ce que ça fait des humains ?** Ou est-ce que ça rend des mannequins gris — le modèle
   recopiant la forme au lieu de l'habiller. C'est le vrai risque. Le `negative_prompt` attaque déjà
   `mannequin, dummy, doll, 3d render`.
3. **Est-ce que les trois raccordent ?** Même pièce, mêmes deux hommes, même manteau, même lumière.
   C'est la thèse du projet en une image.

## Si ça rate

- **Rendu trop « propre »** → ajouter un léger bruit sur la passe depth, et passer la beauty greybox
  en référence plutôt que la depth pure.
- **Mannequins gris en sortie** → générer d'abord la **first frame** de chaque angle avec un modèle
  image depth-guided partageant la même ref de perso, puis faire de l'image-to-video. Plus lent,
  nettement plus stable. C'est le plan B documenté dans `docs/generathon/PLAN.md`.
- **Angles qui ne raccordent pas** → verrouiller par une ref de personnage commune plutôt que par le
  seed seul.

## Statut au 31/07

- ✅ Rendu headless, 6 clips, depth propre et non scintillante, blocking à 180° respecté
- ⏳ Appel fal — **à lancer sur ta machine**, bloqué depuis ce conteneur
