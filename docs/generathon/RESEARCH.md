# Generathon — Recherche : les vrais pain points de la vidéo IA (juillet 2026)

> Track visé : **Tools for AI Artists**
> Question de départ : comment aider un réalisateur à diriger précisément un modèle vidéo ?

---

## Résumé

Le consensus 2026 est net : **la méthode la plus fiable pour diriger un modèle vidéo, c'est de blocker
le plan en 3D d'abord** (Blender → passe depth/pose → modèle vidéo). Mais cette méthode exige Blender +
ComfyUI + un rig OpenPose + du Python. La bonne solution existe — elle est juste inaccessible à
99 % des réalisateurs.

Deux publications académiques (CHI 2026, ICCV 2024) valident le besoin. **Aucun produit grand public ne le sert.**

---

## 1. Les pain points, classés par douleur réelle

### #1 — La génération est une loterie, pas une direction

L'industrie l'a acté : **l'adhérence au prompt pèse désormais 60 % du score de performance d'un modèle**,
devant la résolution et le framerate.
→ [Digen — AI Video Prompt Adherence Benchmark 2026](https://resource.digen.ai/ai-video-prompt-adherence-benchmark-2026/)

Concrètement :

- Les créateurs **brûlent des crédits et des heures** sur des sorties où le visage dérive pendant un
  simple pan, où le décor hallucine (« semantic drift »).
- Sur les mouvements caméra : *« les modèles interprètent les instructions de mouvement de façon vague ;
  sans précision, ils défaussent sur un plan statique »*.
  Cause racine identifiée dans la littérature : **les données d'entraînement n'annotent quasiment jamais
  les mouvements caméra**.
  → [Training-free Camera Control](https://arxiv.org/html/2406.10126v1) ·
    [Motion Prompting](https://arxiv.org/html/2412.02700v1)
- Le vocabulaire change selon le modèle : Seedance attend `Camera: [move] + [speed] + [subject lock]`,
  Kling autre chose, Veo encore autre chose. Une grammaire à apprendre par modèle.
  → [Seedance 2.0 Camera Movement Cheat Sheet](https://www.promeai.pro/blog/seedance-2-0-camera-movement-cheat-sheet/)

Le mot qui revient partout : le passage du **« lottery style »** au **« sculpting style »**.

### #2 — La consistance qui s'effrite

> *« Génère un détective au plan 1, les outils génériques te donnent une autre personne au plan 2. »*
> — [Vertical Motion](https://motion.verticalstudio.ai/blog/best-ai-director-tools-filmmakers-2026)

Au plan 5 les cheveux ont changé, au plan 20 c'est quelqu'un d'autre.
→ [Magic Hour — Character consistency 2026](https://magichour.ai/blog/how-to-keep-characters-consistent-in-ai-video)

Les modèles progressent (Kling 3.0 refs multi-angles, Seedance 2.0 « Universal Reference »,
Veo 3.1 reference images) mais **le workflow reste artisanal** : verrouiller une image de ref,
la réinjecter partout, chaîner first/last frame à la main.

### #3 — Le raccord et le montage sont du « bookkeeping »

Clips de 6-8 s → narration hachée. Chaîner = gérer manuellement first/last frame, framerate,
colorimétrie, audio.

> *« L'édition timeline traite chaque clip comme un objet fini et séparé ; il faudrait que la frame
> de jointure soit un objet partagé. »*
> — [Medium, juin 2026](https://medium.com/@shrutisaagar13/first-frame-last-frame-how-i-chain-ai-clips-into-one-continuous-shot-e6649434e689)

### #4 — La 3D : la meilleure méthode, réservée aux experts ⭐

> *« La façon la plus fiable de diriger un modèle vidéo, c'est de blocker ton plan dans Blender : tu
> animes une version rough du perso et de la caméra en 3D, tu exportes le rendu comme référence de
> mouvement, et tu le donnes au modèle avec une start frame — le modèle suit ton mouvement caméra
> et l'action exactement. »*
> — [Flick — Blender for AI Filmmaking, guide 2026](https://flick.art/blog/blender-ai-filmmaking)

Le pipeline technique est mûr : Blender exporte depth / normal / Canny / OpenPose → ControlNet ou
**Wan 2.2 VACE** restyle en respectant la géométrie frame par frame.

**Et voilà le mur.** Le papier **PrevizWhiz** (Autodesk Research, CHI 2026) énonce le gap exactement :

> *« Les storyboards dessinés manquent de la précision spatiale nécessaire à une cinématographie
> complexe, tandis que la previz 3D exige de l'expertise et des assets riggés de qualité. »*
> — [arXiv:2602.03838](https://arxiv.org/abs/2602.03838) · [CHI '26](https://dl.acm.org/doi/10.1145/3772318.3790534)

Leur étude avec des réalisateurs conclut que combiner **scènes 3D rough + modèles génératifs** abaisse
les barrières techniques, accélère l'itération et comble le fossé de communication.
Même conclusion pour [CinePreGen](https://arxiv.org/html/2408.17424v1) (interface caméra + storyboard
sur diffusion pilotée par moteur 3D).

Et l'outil qui permettrait ça aujourd'hui — ComfyUI — est explicitement décrit comme une barrière :
*« Python, drivers CUDA, téléchargements de modèles, conflits de dépendances… des graphes de nœuds que
seul leur auteur sait lire »*. Verdict : *« ce n'est pas un outil "jump in and go", c'est un outil
"passe un week-end à l'apprendre" »*.

### #5 — On ne peut pas diriger une performance

Micro-expressions, intention de jeu, improvisation : hors de portée. Un réalisateur ne peut pas dire
*« refais-le, mais plus las »*. Vrai pain point, **hors scope pour 24 h**.

---

## 2. Le paysage concurrentiel

| Outil | Ce qu'il fait bien | Ce qu'il ne fait pas |
|---|---|---|
| **LTX Studio** | Script → storyboard → vidéo, gestion de projet | Contrôle spatial ; qualité plafonnée par les modèles open-source sous-jacents |
| **Higgsfield** | 50+ presets de mouvement caméra, tests visuels rapides | *« Plateforme de test visuel, pas un espace de production »* — presets ≠ contrôle |
| **Runway Gen-4.5 / Aleph** | Motion brush, refs ; Aleph change l'angle caméra d'un plan **existant** | 5 s max par génération ; édite l'existant, ne planifie pas |
| **Kling 3.0** | Multi-shot 3-15 s, refs multi-angles, first/last frame | Tu subis le découpage du modèle, tu ne le décides pas |
| **Seedance 2.0** | « Director-level camera control »… en langage naturel | C'est du prompt, donc approximatif. Pas de géométrie. |
| **Invideo Agent** | Mémoire projet longue (perso / costume / décor persistants) | Automatisation, pas direction |
| **Blender + VACE (ComfyUI)** | **Le vrai contrôle géométrique** | Réservé aux techniciens |
| **Greybox.app** | Blockout 3D navigateur + rendu IA | **Images seulement**, pas de vidéo, pas de langage caméra ciné |

**Le trou : personne ne vend le contrôle spatial exact (position caméra, focale, trajectoire, blocking
des acteurs) dans une interface utilisable par un réalisateur.**

---

## 3. L'insight retenu — la **couverture**

Tout le monde attaque le problème comme « générer un beau plan ». Mais un réalisateur ne travaille pas
au plan, il travaille à la **scène** — et il lui faut de la **couverture** : le même moment en large,
en plan moyen, en gros plan, en champ-contrechamp. C'est ce qui permet de *monter*.

> **Les modèles IA savent générer des plans. Aucun ne sait donner de la couverture.**

Aujourd'hui, refilmer le même beat sous un autre angle = relancer la loterie et obtenir une autre
action, un autre acteur, une autre lumière. C'est **la raison n°1 pour laquelle les films IA
ressemblent à un diaporama de jolis plans plutôt qu'à un film monté.**

Si la scène est définie une fois en 3D — géométrie, timing, blocking — alors N caméras dans cette même
scène produisent N angles **du même moment**, qui raccordent. Le problème passe de « relancer la
loterie » à « poser une deuxième caméra ».

---

## 4. Faisabilité API (vérifiée)

| Brique | Détail | Coût / latence |
|---|---|---|
| **Wan VACE 14B** (fal) | endpoints `/depth` et `/pose`, video-to-video structurel | **0,04 $/s en 480p**, 0,06 $ en 580p, 0,08 $ en 720p — ~1 min de génération |
| **Seedance 2.0 reference-to-video** (fal) | jusqu'à 12 refs (images + **vidéos** + audio), `@Image1` / `@Video1` dans le prompt | ~0,30 $/s en 720p, **×0,6 si input vidéo** → ~0,18 $/s ; version *fast* ~0,145 $/s |
| **Depth pass** | natif en Three.js / R3F (depth render target) — **pas besoin de Blender côté produit** | gratuit, temps réel |
| **Supabase** | storage rendus + auth + realtime shot board + pgvector refs | prix spécial sponsor sur tous les tracks |

→ [fal — Wan VACE 14B](https://fal.ai/models/fal-ai/wan-vace-14b) ·
  [fal — Seedance 2.0 reference-to-video](https://fal.ai/models/bytedance/seedance-2.0/reference-to-video)

---

## 5. Alternatives évaluées et écartées

- **« Joue la scène toi-même »** — tu filmes le mouvement au téléphone, on extrait pose + depth +
  trajectoire, on transfère sur le plan IA. Démo la plus spectaculaire, beaucoup moins d'UI.
  Risque : perçu comme un wrapper de VACE. **Gardé comme mode d'entrée secondaire.**
- **Compilateur de prompts multi-modèles** — une intention → prompts optimisés par modèle, génération
  parallèle, comparaison. Utile mais ne résout pas la géométrie ; sent le wrapper.
- **Angle CapCut / UGC** — les plaintes réelles portent sur le paywall et le support, pas sur des
  features manquantes ([Product Hunt](https://www.producthunt.com/products/capcut/reviews) ·
  [eesel](https://www.eesel.ai/blog/capcut-reviews)). Le vrai pain UGC est en amont (*« la plupart des
  UGC ratés échouent avant le tournage : brief vague → contenu vague »*). Marché saturé, et hors track.
