# Découpage — plan de bataille 24 h

> **Les modèles IA savent générer des plans. Aucun ne sait donner de la couverture.**

**Découpage** — le terme français du découpage technique, utilisé tel quel dans le cinéma international.

Un réalisateur ne tourne pas des plans, il tourne des **scènes**. Il lui faut de la **couverture** :
le même moment en large, en plan moyen, en gros plan, en champ-contrechamp — c'est ce qui permet de
monter. Aujourd'hui, refilmer le même beat sous un autre angle avec un modèle IA, c'est relancer la
loterie : autre action, autre acteur, autre lumière.

Découpage définit la scène **une seule fois en 3D** — géométrie, timing, blocking — puis y pose N
caméras. Le problème passe de « relancer la loterie » à « poser une deuxième caméra ».

---

## 1. Le produit en 5 gestes

1. **Tu décris la scène.** Un LLM construit un plateau greybox : sol, murs, deux mannequins, une table.
   Rough, volontairement moche.
2. **Tu blockes en plan de plateau** — vue de dessus, comme un vrai réalisateur : tu déplaces les
   acteurs, tu poses les caméras avec leur cône de champ, tu choisis la focale (24 / 35 / 50 / 85 mm),
   tu traces la trajectoire de dolly. Preview 3D à côté.
3. **Tu parles réal** : *« passe en contre-plongée, serre en plan taille, dolly avant lent »* → le LLM
   traduit en paramètres 3D exacts **et** en syntaxe prompt du modèle cible.
4. **Tu génères la couverture** : chaque caméra rend une passe greybox + depth, envoyée comme vidéo de
   contrôle. N angles, même beat, mêmes refs de perso.
5. **Ça tombe monté** sur une timeline. Export.

---

## 2. Architecture

### Stack

- **Front** — Next.js 15 (App Router) + React Three Fiber + drei, déployé sur Vercel
- **Backend** — Supabase : Postgres, Storage, Realtime, Auth
- **Génération** — fal.ai
  - `fal-ai/wan-vace-14b/depth` — chemin principal (control video → video, 0,04 $/s en 480p)
  - `bytedance/seedance-2.0/reference-to-video` — chemin qualité (`@Video1` = motion ref, `@Image1` = perso)
  - un modèle image depth-guided pour la **first frame** (verrouille look + perso avant l'i2v)
- **LLM** — Claude pour : scène → layout 3D JSON, et langage réal → params caméra + prompt compilé

### Modèle de données

```
scene   (id, title, prompt, layout_json, style_ref_url, seed)
actor   (id, scene_id, name, ref_image_url, position, rotation, keyframes)
camera  (id, scene_id, label, focal_mm, height_m, position, target, path_keyframes, shot_size)
take    (id, camera_id, control_video_url, output_video_url, model, params, status, cost_usd)
```

Le `seed` et le `style_ref_url` vivent au niveau **scène**, pas au niveau plan. C'est ce qui fait
raccorder la couverture.

### Le cœur technique — le « control pass »

Pour chaque caméra :

1. R3F rend la scène sur N frames (ex. 4 s @ 16 fps = 64 frames) dans deux render targets :
   - **depth pass** — `MeshDepthMaterial`, normalisé sur near/far de la caméra
   - **greybox beauty** — matériaux mats gris, silhouettes lisibles (sert de motion ref à Seedance)
2. Encodage mp4 **côté client** via WebCodecs (`VideoEncoder`) → Blob → upload Supabase Storage → URL publique
3. Appel fal : `video_url` = control video, `prompt` = prompt compilé, + ref image perso
4. Polling de la queue fal → output → Supabase → timeline

> Pas de Blender dans le produit. Blender reste l'**import optionnel** pour les pros (argument de
> roadmap dans le pitch, pas de code à écrire).

### Le compilateur de direction

**Input** : intention en français + état de la scène 3D
**Output** : JSON `{ camera: { focal_mm, height_m, position, target, move: {type, speed} }, prompt: "…" }`

Le LLM applique les paramètres à la scène — donc **la caméra bouge visiblement à l'écran quand tu
parles**. C'est LE moment de démo.

### Ce qui fait raccorder la couverture

- Même `seed`, mêmes refs perso, même prompt de style, même timing → **seules les caméras diffèrent**
- **Règle des 180°** : on trace la ligne d'action sur le plan de plateau et on **alerte** si une caméra
  la franchit. Détail qui hurle « on connaît le métier » au jury.
- Auto-assemblage : couper sur le beat, alterner les tailles de plan

---

## 3. Planning heure par heure

Kickoff samedi 10:00 · deadline dimanche **15:00 (dure)** = 29 h de mur, ~24 h utiles.

| Créneau | Bloc | Livrable |
|---|---|---|
| **10:00–11:00** | **S0 — Setup & dé-risquage** | Repo, Vercel, Supabase, clés fal. **Smoke test immédiat** : un mp4 de depth bidon → fal VACE depth → vidéo. |
| **11:00–14:00** | **S1 — Le plateau** | R3F : sol, grille, 2 mannequins, caméra. Vue de dessus ortho + vue caméra côte à côte. Drag des acteurs et caméras, cône de champ dessiné selon la focale. |
| *12:30* | *déjeuner* | (mange en codant si S1 n'est pas fini) |
| **14:00–17:00** | **S2 — Le control pass** | Depth render target + greybox pass → WebCodecs mp4 → Supabase → fal. **Milestone : premier plan généré depuis une caméra que tu as posée.** |
| **17:00–20:00** | **S3 — La couverture** | Multi-caméras, génération parallèle sur la queue fal, verrouillage seed/ref/style, timeline d'assemblage. |
| **20:00–21:00** | *dîner gastronomique* | Profites-en, tu l'as mérité. |
| **21:00–00:00** | **S4 — Le compilateur** | Chat « parle réal » → params caméra + prompt. Scène → layout 3D auto. **Le moment magique : tu écris, la caméra bouge.** |
| **00:00–03:00** | **S5 — Polish** | Alerte franchissement d'axe (180°), UI dark cinéma, états de chargement soignés. |
| **03:00–07:00** | **🛌 DORS** | Sérieusement. 4 h. Le pitch de dimanche vaut plus que 4 h de code à 4 h du mat. |
| **07:00–11:00** | **S6 — LE FILM** | Produis une vraie scène de 30-45 s entièrement faite avec l'outil, montée depuis la couverture générée. **C'est ça qui gagne, pas le code.** |
| **11:00–14:00** | **S7 — Pitch** | Deck 5 slides max. Répète 5×, chronomètre. **Enregistre TOUTE la démo en vidéo** (backup si le wifi meurt). |
| **14:00–15:00** | **Buffer + soumission** | Ne joue pas avec la deadline dure. |

### Cut lines — ce qu'on coupe si on est en retard, dans cet ordre

1. Scène → layout 3D auto par LLM → *on hardcode 2 décors preset*
2. Alerte 180°
3. Auto-assemblage → *montage à la main dans CapCut (et clin d'œil au sponsor)*
4. Les mannequins animés → *statiques, seule la caméra bouge — **ça suffit pour démontrer la couverture***

### Ce qu'on ne coupe JAMAIS

**Le multi-caméras.** C'est le produit. S'il ne reste qu'une chose à la fin, c'est trois angles du même
moment qui raccordent.

---

## 4. Le pitch (3 minutes)

1. **Le problème, montré pas dit** *(20 s)* — un montage de « films IA » : des plans magnifiques qui ne
   raccordent pas. *« Voilà le cinéma IA aujourd'hui. Des plans magnifiques. Aucun film. »*
2. **Pourquoi** *(20 s)* — *« Parce qu'un réalisateur ne tourne pas des plans, il tourne des scènes. Il
   lui faut de la couverture. Et aucun modèle ne sait donner deux fois le même moment sous deux angles. »*
3. **Démo live** *(90 s)* — plan de plateau → tu poses 3 caméras → tu écris « contre-plongée, 85 mm,
   dolly avant » → **la caméra bouge à l'écran** → générer → les 3 angles arrivent
4. **Le film** *(30 s)* — la scène montée, plein écran, son
5. **Close** *(20 s)* — *« Le découpage technique existe depuis 100 ans. On vient juste de le rendre
   exécutable. »*

---

## 5. À vérifier AVANT le kickoff

- [ ] Compte **fal.ai** créé + clé API + crédits chargés
- [ ] Projet **Supabase** créé (bucket public pour les control videos)
- [ ] **Smoke test n°1** — un mp4 depth synthétique → `fal-ai/wan-vace-14b/depth` → la sortie
      respecte-t-elle vraiment la géométrie ? *C'est le seul risque qui peut tuer le projet.*
- [ ] **Smoke test n°2** — même chose sur `seedance-2.0/reference-to-video` avec le greybox en `@Video1`
- [ ] WebCodecs `VideoEncoder` dispo dans Chrome sur ta machine (fallback : upload d'un ZIP de frames
      + encodage serveur ffmpeg)
- [ ] Un GLTF de mannequin humain libre de droits, léger (< 2 Mo)
- [ ] Vercel + Supabase reliés au repo, déploiement blanc réussi

---

## 6. Notes de risque

- **Risque n°1 — le rendu VACE depuis une depth synthétique.** Les workflows publics partent de rendus
  Blender (matériaux, éclairage, antialiasing). Une depth WebGL brute est plus « propre » — à tester tôt.
  Mitigation : ajouter du bruit léger + un rendu greybox éclairé en plus de la depth pure.
- **Risque n°2 — le raccord.** Même seed ≠ même monde garanti sur un modèle v2v. Mitigation : générer
  la **first frame de chaque angle** avec un modèle image depth-guided partageant la même ref perso,
  puis i2v. Plus lent mais bien plus stable.
- **Risque n°3 — le scope 3D.** Un éditeur 3D complet est un piège. Le plan de plateau vue de dessus
  est 10× plus rapide à construire, c'est le langage natif des réalisateurs, et ça se lit
  instantanément sur un écran de pitch. **Ne pas dériver vers un mini-Blender.**
- **Risque n°4 — le wifi de l'event.** Tout enregistrer en vidéo dès que ça marche.
