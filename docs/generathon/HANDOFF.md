# 🎬 Découpage — briefing de reprise

> **Document autonome.** À coller en début de session fraîche. Tout ce qui suit a été décidé,
> vérifié ou dé-risqué la veille du hackathon. Les autres fichiers de `docs/generathon/` sont les
> pièces détaillées ; celui-ci suffit pour démarrer.

**Branche de travail : `claude/generathon-ai-tools-directors-c434u4`**

---

## 0. Où on en est en dix lignes

- **Le projet est choisi** : *Découpage*, track « Tools for AI Artists ».
- **Trois alternatives ont été dé-risquées et écartées** (rapports dans le repo). Chacune laisse
  une feature à greffer, pas un projet.
- **Le harnais technique tourne déjà** : rendu greybox headless, passe depth propre, 3 caméras
  résolues par un solveur, invariant 180° vérifié.
- **Un seul inconnu technique reste** : l'appel fal n'a jamais été exécuté (bloqué par la politique
  réseau du conteneur précédent). **C'est la première chose à faire.**
- Deux découvertes tardives ont changé le pitch : **Runway Aleph** vend déjà de la « couverture », et
  **World Labs Marble** passe de concurrent à fournisseur de décors.
- L'analyse du **pitch gagnant d'un hackathon fal × Sequoia sur le même thème** a donné quatre
  consignes de démo contre-intuitives, dont une feature réclamée par un juré.

---

## 1. Le contexte

Hackathon **Generathon**, Paris, 1-2 août 2026. 24 h de build, équipes de 1 à 3.
Track visé : **Tools for AI Artists** (les deux autres : AI Cinema & Series, AI Shorts & Vertical).

- Kickoff samedi 10:00 · **deadline dure dimanche 15:00** · pitch live 3 min à 17:30
- Sponsors : **Supabase** (prix spécial sur tous les tracks), **Cursor**, **CapCut**, Station F, Naano
- Organisateur : Le Motif, créateur de contenu IA, communauté de 1 000+ membres
- 50 builders. **Beaucoup produiront une variante de « plateforme IA créative unifiée »** —
  c'est le projet modal, et c'est une raison de plus de ne pas en faire une.

---

## 2. Le projet

### La thèse

Un réalisateur ne tourne pas des plans, il tourne des **scènes**. Il lui faut de la **couverture** :
le même moment en large, en plan moyen, en gros plan, en champ-contrechamp — c'est ce qui permet de
**monter**. Aujourd'hui, refilmer le même beat sous un autre angle avec un modèle IA, c'est relancer
la loterie : autre action, autre acteur, autre lumière. D'où des « films IA » qui ressemblent à un
diaporama de beaux plans.

**Découpage définit la scène une seule fois en 3D** — géométrie, timing, blocking — puis y pose N
caméras. Le problème passe de « relancer la loterie » à « poser une deuxième caméra ».

*Découpage* est le terme français du découpage technique, utilisé tel quel dans le cinéma
international.

### Le produit en cinq gestes

1. **Tu décris la scène** → un LLM construit un plateau greybox (sol, murs, deux mannequins, une table)
2. **Tu blockes en plan de plateau** — vue de dessus, comme un vrai réalisateur : acteurs, caméras
   avec leur cône de champ, focale, trajectoire de dolly. Preview 3D à côté
3. **Tu parles réal** — *« contre-plongée, plan poitrine, dolly avant lent »* → la caméra bouge à
   l'écran
4. **Tu génères la couverture** — chaque caméra rend une passe depth + greybox, envoyée comme control
   video. N angles, même beat, mêmes refs
5. **Ça tombe monté** sur une timeline

### La décision d'architecture qui porte tout

**Le LLM ne sort jamais de coordonnées.** Un LLM à qui on demande « place la caméra à 2,5 m en
contre-plongée » sort des nombres plausibles et faux — on aurait recréé la loterie qu'on prétend
supprimer. Il ne fait qu'une chose : traduire du français de réalisateur en **vocabulaire de cinéma
structuré**. La géométrie est résolue par du code déterministe.

Conséquences : reproductible (même intention → même caméra), les **180° deviennent un invariant
vérifiable** et pas un espoir, et quand un plan est faux on sait si c'est la traduction ou la
géométrie.

---

## 3. Ce qui existe déjà dans le repo, et qui marche

### `derisk/` — le harnais (vérifié, tourne)

| Fichier | Rôle |
|---|---|
| `scene.html` | Plateau greybox Three.js. 3 caméras sur le même beat de 3 s, résolues par le solveur |
| `render.mjs` | Rendu headless (Chromium + WebGL SwiftShader) → PNG → mp4 via ffmpeg. ~2 min pour 6 clips |
| `shot_solver.mjs` | **Le solveur.** ShotSpec → CameraState. Auto-test inclus : `node shot_solver.mjs` |
| `fal_smoke.mjs` | Appel fal. **Jamais exécuté** — voir §8 |

```bash
cd derisk && npm install
node shot_solver.mjs     # auto-test du solveur, vérifie l'invariant 180°
node render.mjs          # → out/{wide,close,reverse}_{depth,beauty}.mp4
```

### Détails techniques à ne pas perdre

- **La passe depth est normalisée sur un near/far FIXE, pas auto par frame.** L'auto-normalisation
  fait scintiller la profondeur, et le modèle vidéo lit ce scintillement comme du mouvement.
  Convention MiDaS : proche = blanc.
- **La formule du solveur** — une taille de plan est une hauteur de cadre en mètres, et avec un
  capteur full-frame : **distance = hauteur cadrée × focale ÷ 24**. Un CU au 85 mm → 1,59 m ; un
  large au 35 → 4,67 m. Distances de tournage crédibles.
- **Le cadre s'ancre par le HAUT** (sommet du crâne + un peu d'air), pas par un point interpolé au
  centre du corps. L'erreur naturelle est l'interpolation, et **elle décapite les personnages** dès
  le plan poitrine. Bug trouvé et corrigé la veille — ne pas le réintroduire.
- **Limite connue** : le solveur ne détecte pas les collisions décor, il peut poser une caméra dans
  une table aux focales courtes.
- Les acteurs greybox ont jambes, bras, cou : un modèle conditionné par la depth rend ce qu'il voit,
  et une capsule + une sphère donne un bonhomme de neige.

### `docs/generathon/` — les pièces

| Fichier | Contenu |
|---|---|
| `PLAN.md` | Architecture, planning heure par heure, cut lines, pitch, ligne de défense |
| `GRAMMAR.md` | La grammaire de direction, le prompt système à copier tel quel, les tables |
| `RESEARCH.md` | Les pain points 2026 avec sources, le paysage concurrentiel |
| `RESOURCES.md` | Audit de l'open source à vendoriser, verdicts sur les ressources partagées |
| `MARBLE.md` | La couche décor Marble — API, Spark, comment ça s'emboîte |
| `JURY-SIGNALS.md` | Analyse du pitch gagnant fal × Sequoia — **à lire avant d'écrire le pitch** |
| `derisk-{B,C,D}-*.md` | Les trois alternatives écartées, en détail |

---

## 4. Architecture cible

```
Front    Next.js 15 (App Router) + React Three Fiber + drei → Vercel
Backend  Supabase — Postgres, Storage, Realtime, Auth  (→ prix spécial sponsor)
Génér.   fal.ai
         · fal-ai/wan-vace-14b/depth              control video → video, 0,04 $/s en 480p, ~1 min
         · bytedance/seedance-2.0/reference-to-video   @Video1 = motion ref, ~0,18 $/s avec input vidéo
         · un modèle image depth-guided pour la first frame (verrouille look + perso avant i2v)
LLM      Claude — scène → layout 3D, et langage réal → ShotSpec
```

**Le control pass**, pour chaque caméra : R3F rend N frames en deux passes (depth + greybox beauty)
→ encodage mp4 côté client via WebCodecs → upload Supabase → appel fal → polling → timeline.

**Modèle de données** — le `seed` et le `style_ref_url` vivent au niveau **scène**, pas au niveau
plan. C'est mécaniquement ce qui fait raccorder la couverture.

```
scene   (id, title, prompt, layout_json, style_ref_url, seed)
actor   (id, scene_id, name, ref_image_url, position, rotation, keyframes)
camera  (id, scene_id, label, focal_mm, height_m, position, target, path_keyframes, shot_size)
take    (id, camera_id, control_video_url, output_video_url, model, params, status, cost_usd)
```

### La couche décor Marble — additive, jamais fondatrice

La **World API** de World Labs est publique depuis janvier 2026 : génération de mondes depuis texte,
images, vidéo **et blockout 3D** (« 3D input », beta). Elle exporte **splat + collider mesh**. Et
**Spark**, leur renderer 3DGS pour Three.js (**MIT**, `npm i @sparkjsdev/spark`), **fusionne splats
et meshes dans une même scène**.

```
Marble  ─┬─► splat .ply ─────────► passe beauty     (Spark, dans notre scène R3F)
         └─► collider mesh ──┐
                             ├──► passe depth       (notre shader, inchangé)
nos mannequins greybox ──────┘
nos caméras (le solveur) ─────────► la couverture
```

Le gain n'est pas esthétique, il est **structurel** : plus la part du cadre qui est verrouillée est
grande, moins le modèle peut dériver. Avec un décor Marble, le modèle n'a plus qu'à inventer les
humains, et le décor est identique d'un angle à l'autre **par construction**.

Et comme Marble accepte un blockout 3D en entrée, la boucle se ferme : notre greybox → Marble →
décor photoréaliste → on tourne la couverture dedans.

> ⚠️ **Séquencement non négociable** : Marble ne se branche qu'**après** que la boucle multi-caméras
> tourne de bout en bout. Couche additive derrière un flag. Si la boucle n'est pas finie à 20 h
> samedi, Marble saute — un multiplicateur par zéro fait toujours zéro. Plan **Pro à 35 $/mois**
> requis pour les droits commerciaux si on diffuse publiquement.

---

## 5. La concurrence, et la ligne de défense

**Deux affirmations ont dû être retirées du pitch parce qu'elles sont fausses.** Ne pas les
réintroduire :

- ❌ « Aucun outil ne sait donner de la couverture » — **Runway Aleph vend explicitement
  *« endless coverage from a single shot »***, wides, close-ups, reverse angles, en reconstruisant la
  géométrie 3D par estimation de profondeur.
- ❌ « Personne ne fait blockout 3D → vidéo » — **Marble** rend des vidéos à contrôle caméra au pixel
  près depuis un blockout, et **FormBar** (gagnant fal × Sequoia) fait photo → 3D éditable → clay →
  génération.

**Ce qui survit, et qui est vrai :**

> **Aleph et Marble résolvent l'espace. Personne ne résout le temps.**
> Aleph ré-angle un instant figé, Marble fabrique un lieu vide. La couverture est un problème
> temporel : les mêmes trois secondes de jeu, quatre fois, qui raccordent.

| Si le jury dit… | Réponse |
|---|---|
| « Runway Aleph fait déjà ça » | *« Aleph part de rushes, il ré-angle ce qui a été tourné — c'est de la post-production. Nous, rien n'a été tourné : on décide la couverture d'une scène qui n'existe pas encore. Aleph déplace la caméra, nous déplaçons l'acteur. »* |
| « Marble fait déjà ça » | *« Marble fait le décor — on l'utilise, c'est notre couche de rendu. Un décor n'est pas une scène : il n'y a personne dedans qui joue. Notre unité, c'est le beat, pas le lieu. »* |
| « C'est FormBar » | *« FormBar corrige un plan. Nous donnons une scène. Et le timing acteur/caméra que leur juré leur a réclamé, on l'a. »* |
| « C'est ComfyUI avec une jolie UI » | *« ComfyUI vous demande de savoir ce qu'est une passe depth. Nous on vous demande où vous mettez la caméra. »* |

---

## 6. Le planning

| Créneau | Bloc | Livrable |
|---|---|---|
| **10:00–11:00** | **S0 — Setup & dé-risquage** | Repo, Vercel, Supabase, clés fal. **Smoke test fal immédiat** (§8) |
| **11:00–14:00** | **S1 — Le plateau** | R3F : sol, 2 mannequins, caméra. Vue de dessus ortho + vue caméra. Drag acteurs/caméras, cône de champ |
| **14:00–17:00** | **S2 — Le control pass** | Depth + greybox → WebCodecs mp4 → Supabase → fal. **Milestone : premier plan généré depuis une caméra que tu as posée** |
| **17:00–20:00** | **S3 — La couverture** | Multi-caméras, génération parallèle, verrouillage seed/ref/style, timeline |
| **20:00–21:00** | *dîner* | Le dîner est gastronomique. Profites-en |
| **21:00–00:00** | **S4 — Le compilateur** | Chat « parle réal » → ShotSpec → caméra. **Le moment magique : tu écris, la caméra bouge** |
| **00:00–03:00** | **S5 — Polish** | **Décalage de timing acteur/caméra** (§7), alerte 180°, UI dark cinéma |
| **03:00–07:00** | **🛌 DORS** | 4 h. Le pitch vaut plus que 4 h de code à 4 h du mat |
| **07:00–11:00** | **S6 — LE FILM** | Une vraie scène de 30-45 s faite avec l'outil, montée depuis la couverture. **C'est ça qui gagne, pas le code** |
| **11:00–14:00** | **S7 — Pitch** | 5 slides max. Répéter 5×, chronomètre. **Enregistrer toute la démo en backup** |
| **14:00–15:00** | **Buffer + soumission** | Ne pas jouer avec la deadline dure |

### Cut lines — dans cet ordre

1. Scène → layout 3D auto par LLM → *hardcoder 2 décors preset*
2. Alerte 180°
3. Auto-assemblage → *montage à la main dans CapCut (clin d'œil au sponsor)*
4. Mannequins animés → *statiques, seule la caméra bouge — suffit pour démontrer la couverture*

### Ce qu'on ne coupe JAMAIS

**Le multi-caméras.** C'est le produit. S'il ne reste qu'une chose, c'est trois angles du même moment
qui raccordent.

### Les trois features rescapées du dé-risquage — en choisir UNE

Elles atterrissent toutes dans le même créneau S5 de 3 h.

| # | Feature | Coût | Risque | Apport |
|---|---|---|---|---|
| 1 | **Pose → mannequin** — MediaPipe Pose pilote l'armature greybox | ~4 h | interne | Supprime notre faiblesse (acteurs statiques). *« Joue-le une fois, récupère-le sous quatre angles »* — impossible chez Act-Two/Kling/Luma, qui n'ont pas de scène |
| 2 | **Vérificateur d'adhérence** — écart mesuré entre la vidéo générée et le rendu greybox | 2-3 h | interne | On a la vérité terrain 3D, personne d'autre. Transforme une affirmation en mesure |
| 3 | **Export projet CapCut** | ~3 h | **externe, binaire** | Optimal côté sponsor. Bon *deuxième* moment de démo, jamais le premier. Format de draft non officiel + clause CGU anti-reverse-engineering : test binaire de 30 min avant tout engagement, et ne pas présenter ça de façon ambiguë |

**Recommandation : la n°1 seule.** C'est la seule qui change ce que le produit *est*.

---

## 7. Le pitch et la doctrine de démo

*(Détail et sources dans `JURY-SIGNALS.md` — analyse du pitch gagnant fal × Sequoia.)*

### Structure, 3 minutes

1. **Le problème, montré pas dit** *(20 s)* — un montage de « films IA » : des plans magnifiques qui
   ne raccordent pas. *« Voilà le cinéma IA aujourd'hui. Des plans magnifiques. Aucun film. »*
2. **Pourquoi** *(20 s)* — *« Un réalisateur ne tourne pas des plans, il tourne des scènes. Il lui
   faut de la couverture : le même moment, sous plusieurs angles, qui se montent. »*
3. **On nomme les concurrents** *(20 s)* — voir §5. Les nommer soi-même plutôt que se les faire
   opposer en question
4. **Démo live** *(80 s)* — plan de plateau → 3 caméras → « contre-plongée, 85 mm, dolly avant » →
   la caméra bouge → générer → les 3 angles arrivent. Puis **déplacer un acteur et régénérer** :
   le geste qu'aucun concurrent ne peut faire, et il se voit
5. **Le film** *(30 s)* — la scène montée, plein écran, son
6. **Close** *(15 s)* — *« Le découpage technique existe depuis 100 ans. On vient juste de le rendre
   exécutable. »*

### Les quatre consignes tirées du jury du hackathon précédent

1. **La démo honnête bat la démo léchée.** Deux jurés ont récompensé spontanément une démo *« live,
   dans l'éditeur, non cherry-pickée »* — le gagnant a laissé ses propres hésitations à l'écran.
   → Démo dans l'outil. La vidéo enregistrée n'est qu'un backup réseau.
2. **Le test qui décide** : *« on se surprend immédiatement à penser à ce qu'on ferait avec »*.
   → Montrer **le geste**, pas le résultat. Un plan généré est un résultat ; poser une deuxième
   caméra est un geste.
3. **🎁 Le décalage de timing acteur/caméra.** Un juré ex-previz DreamWorks l'a réclamé nommément au
   gagnant : *« quand est-ce que tu pousses la caméra par rapport aux personnages ? Ce sont ces
   subtilités de timing qui font la magie poétique d'une séquence. »* C'est notre « personne ne
   résout le temps » formulé par un juré, et c'est presque gratuit : le solveur interpole déjà la
   caméra sur `t`, il suffit d'un `delay_s` par acteur. **À implémenter et à nommer dans le pitch.**
4. **Ne pas se rétrécir au cinéma.** Un juré a spontanément élargi aux romans visuels et au
   storytelling *« même sans équipe caméra »*. Le track s'appelle « Tools for AI Artists ».

---

## 8. À faire AVANT d'écrire une ligne de produit

- [ ] **🔴 LE SMOKE TEST FAL.** Le seul inconnu qui peut tuer le projet : est-ce qu'une depth
      **synthétique** (WebGL, propre, sans grain) pilote correctement un modèle vidéo, et est-ce que
      les 3 angles raccordent ? Tous les workflows publics partent de rendus **Blender**.
      ```bash
      cd derisk && npm install && node render.mjs
      export FAL_KEY=...
      node fal_smoke.mjs probe     # ⚠️ EN PREMIER — dump le schéma réel de l'endpoint
      node fal_smoke.mjs run       # les 3 caméras, ~0,12 $ le lot
      ```
      `probe` d'abord parce que les noms de champs dans `payload()` sont une hypothèse tirée de la
      doc — l'appel n'a jamais pu être exécuté (fal bloqué par la politique réseau du conteneur).
      En cas d'erreur, fal renvoie un 422 listant les champs attendus, le script l'affiche verbatim.
- [ ] Compte fal + crédits · projet Supabase (bucket public) · Vercel relié au repo
- [ ] **Si ça rate** : plan B documenté — générer la **first frame** de chaque angle avec un modèle
      image depth-guided partageant la même ref de perso, puis i2v. Plus lent, nettement plus stable.
- [ ] Marble (optionnel, §4) : accès API et tier, latence de génération d'un monde, format du
      collider mesh, et **est-ce qu'une passe depth issue d'un collider mesh basse fidélité suffit**
      (se teste en remplaçant juste la source du depth dans le smoke test)
- [ ] **Vendoriser** [`smixs/visual-skills`](https://github.com/smixs/visual-skills) (**CC BY 4.0**,
      attribution obligatoire) pour la syntaxe prompt par modèle — Seedance 2.5, Kling 3.0, Veo 3.1.
      3-4 h économisées. On vendorise le vocabulaire, on écrit le solveur.

---

## 9. Les pistes écartées — ne pas y revenir

| Piste | Pourquoi elle est morte |
|---|---|
| **Plateforme IA créative unifiée** | L'agrégation est commoditisée (fal donne 500+ modèles sous une clé), c'est bondé, et **aucun moment de démo**. C'est le projet modal du hackathon |
| **B — filmer le mouvement soi-même** | Pitch marketing *officiel* de Runway Act-Two. MVP = un endpoint fal à deux paramètres. Kling motion-control : 6-9 min médian contre un pitch de 3 min, pour **un seul angle** |
| **C — compilateur multi-modèles** | Le mécanisme **aggrave** le problème : on n'enlève pas la loterie, on achète 4 tickets au lieu d'un. Et fal ship déjà son propre Sandbox gratuit |
| **D — UGC / CapCut** | Bain de sang : Arcads est parisien à 15 M$ ARR, et **Icon — pitché « ChatGPT + CapCut pour les pubs », Founders Fund — a fait faillite en mars 2026** |
| **Vidéo → splat → segmentation → édition → régénération** | C'est FormBar, le gagnant fal × Sequoia. Et l'objection de fond : reconstruire de la 3D depuis une vidéo générée est destructeur d'information. Notre thèse, c'est *on écrit la géométrie, on ne la récupère pas*. Le besoin réel derrière (la boucle « corriger puis régénérer ») est déjà satisfait : on n'a jamais perdu la 3D |

---

## 10. Les pain points, pour mémoire

Recherche complète et sources dans `RESEARCH.md`.

1. **La génération est une loterie, pas une direction.** L'adhérence au prompt pèse désormais **60 %**
   du score de perf d'un modèle. Les modèles interprètent les mouvements caméra vaguement — cause
   racine : les données d'entraînement n'annotent quasiment jamais les mouvements caméra
2. **La consistance s'effrite** — au plan 5 les cheveux ont changé, au plan 20 c'est quelqu'un d'autre
3. **Le raccord est du bookkeeping** — clips de 6-8 s, chaînage first/last frame à la main
4. **La previz 3D est la méthode la plus fiable, et elle est réservée aux experts.** PrevizWhiz
   (Autodesk Research, CHI 2026) : *« les storyboards dessinés manquent de précision spatiale, la
   previz 3D exige de l'expertise et des assets riggés »*. C'est exactement le trou qu'on vise
