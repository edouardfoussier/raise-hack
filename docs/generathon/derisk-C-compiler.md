# Dé-risquage — Idée C : le compilateur de prompts multi-modèles

> **Verdict en une ligne : à écarter comme projet autonome.** C'est la feature la plus
> largement shippée de toute la catégorie (Higgsfield, Pollo, Krea, Flora, MoodNode, et
> **fal Sandbox lui-même**), son IP réelle est un repo GitHub en CC BY 4.0, et son mécanisme
> central *aggrave* le pain point qu'il prétend résoudre. Un seul fragment mérite d'être
> sauvé : le **vérificateur d'adhérence contre vérité-terrain 3D**, et uniquement comme
> feature de Découpage.

Date : 31 juillet 2026 · Recherche web uniquement, aucune API appelée.

---

## 1. Le produit en une phrase, et le geste exact

**Une phrase.** « Tu écris ton intention de plan une fois ; on la recompile dans la grammaire
de chaque modèle vidéo, on lance les 4 générations en parallèle, tu compares et tu gardes. »

**Le geste utilisateur, étape par étape :**

1. L'utilisateur écrit son intention en langage naturel : *« un détective entre dans un bureau
   enfumé, la caméra recule lentement et finit en plan taille »*.
2. Il coche les modèles cibles (Seedance 2.0 / Kling 3.0 / Veo 3.1 / Runway Gen-4.5 / Wan 2.7).
3. Un LLM réécrit l'intention en **N prompts distincts**, un par grammaire de modèle
   (Seedance attend `Camera: [move] + [speed] + [subject lock]`, Veo veut de la prose
   cinématographique + description audio, Kling veut des beats de mouvement, etc.).
4. Il clique « Générer ». N jobs partent en parallèle sur fal / Replicate.
5. **Il attend 3 à 5 minutes.** (voir §5 — c'est le problème)
6. Une grille de N vidéos apparaît. Il regarde, il choisit, il sauvegarde le gagnant.
7. *(optionnel, la version « pas wrapper »)* Un juge automatique note chaque sortie sur
   l'adhérence à l'intention et affiche un score + un motif d'échec par vidéo.
8. *(optionnel²)* Une boucle réécrit le prompt du perdant à partir du motif d'échec et relance.

Les étapes 1→6 sont le produit. Les étapes 7→8 sont la seule chose qui pourrait ne pas
être un wrapper — et ce sont précisément celles qui ne tiennent pas en démo live (§5).

---

## 2. Antériorité — la partie qui fait mal

### 2.1 Produits qui shippent déjà exactement ça

| Produit | Ce qu'il fait, textuellement | Verdict |
|---|---|---|
| **fal Sandbox** | « instantly run the same input across multiple models and compare hundreds of models side-by-side for speed, quality and cost » + **enhance prompts with AI** + estimation de coût avant run. Dispo depuis oct. 2025. | ☠️ **Le sponsor-adjacent le fait déjà, mieux, gratuitement.** [docs](https://fal.ai/docs/documentation/model-apis/sandbox) · [annonce](https://x.com/tjack/status/1976436974484676915) |
| **Higgsfield** | « run parallel generations across multiple models concurrently (e.g. running the same scene prompt on Kling, Veo and Seedance at the same time), see your options side-by-side in seconds » — Seedance 2.0, Kling 3.0, Veo 3.1, Wan 2.7, Sora 2. | ☠️ Identique, en prod, avec Cinema Studio et virtual camera en plus. [higgsfield.ai/ai-video](https://higgsfield.ai/ai-video) |
| **Pollo AI** | « test multiple models in parallel using the same creative input, compare the results, commit only when you've seen what each produces » — 15+ modèles. Surnommé « le Spotify de la vidéo IA ». | ☠️ [pollo.ai/text-to-video](https://pollo.ai/text-to-video) · [API platform](https://pollo.ai/api-platform/explore) |
| **MoodNode** | « run your prompt through Kling, Veo, Luma and PixVerse at once and keep the one that won » — 50+ modèles, canvas nodal, **gratuit / BYOK**. | ☠️ Gratuit. [moodnode.ai](https://moodnode.ai/) |
| **Flora** | Canvas nodal, 50+ modèles ; « one prompt wired into Sora 2, Veo 3.1, Kling 3, Runway Gen-4 at once, every take kept in the version tray ». | ☠️ [review](https://tooldirectory.ai/tools/flora) |
| **Krea** | 64+ modèles image+vidéo, 9 $/mois, orchestration multi-modèles. | ☠️ [review](https://www.tooljunction.io/ai-tools/krea) |
| **OpenArt** | Kling 3.0, Veo 3, Seedance, Wan en t2v/i2v dans une même interface. | ☠️ [comparatif](https://promptsrush.com/blog/higgsfield-vs-openart) |
| **Artificial Analysis Video Arena** | Le comparateur côte à côte canonique, Elo sur votes aveugles, 20+ modèles, embed public gratuit. | ☠️ [artificialanalysis.ai/video](https://artificialanalysis.ai/video/leaderboard/text-to-video) · [HF Space](https://huggingface.co/spaces/ArtificialAnalysis/Video-Generation-Arena-Leaderboard) |
| **LLM-Stats media playground** | « run Veo, Sora, Runway, Kling, Luma side by side with the same prompt ». | ☠️ [llm-stats.com](https://llm-stats.com/leaderboards/best-ai-for-video-generation) |
| **Runway API — Model Router** | « saved, no-model generation routing across video, image and audio with **cost, latency or quality preferences** ». | ☠️ **Tue explicitement le bonus « routage auto vers le bon modèle »** : le vendeur l'a intégré. [release notes](https://releasebot.io/updates/runwayai) · [docs](https://docs.dev.runwayml.com/guides/models/) |

Il n'y a pas *un* concurrent qui tue l'idée. Il y en a **dix**, dont un est l'infrastructure
même sur laquelle tu allais construire.

### 2.2 Le générateur de prompt par modèle : commodité SEO totale

La couche « traduis mon intention dans la syntaxe de chaque modèle » est un secteur SEO saturé
de tools gratuits sans inscription :

- [vidfly.ai/video-prompt-generator](https://vidfly.ai/video-prompt-generator/) — « supports Sora, Runway, Veo, Kling », illimité gratuit
- [freeaivideohub.com](https://www.freeaivideohub.com/) — « structured cinematic briefs for Veo, Kling, Runway, Seedance, Luma, Pika », gratuit sans signup
- [promptclicker.com/ai-video-prompter](https://promptclicker.com/ai-video-prompter), [cineprompt.pro](https://www.cineprompt.pro/prompts) (1000+ prompts par modèle), [videosprompt.ai](https://videosprompt.ai/), [promptaivideos.com](https://promptaivideos.com/)

### 2.3 Open source : l'IP que tu comptais construire existe et est licenciée pour être copiée

- **[smixs/visual-skills](https://github.com/smixs/visual-skills)** (CC BY 4.0) — « AI film director
  skills for Claude agents: cinematic dramaturgy (Murch, blocking, montage) + **exact prompt
  syntax** for Seedance 2.5, Kling 3.0 Turbo/Omni, Veo 3.1, Nano Banana 2, GPT Image 2 ».
  Contient `seedance.md`, `kling.md`, `veo.md`, `universal-rules.md` (12 règles transverses),
  des **failure modes avec leurs fixes**, et deux gates de validation obligatoires
  (« six-point dramaturgy check », « three-detail audit »).
  → **C'est littéralement le cœur de l'idée C, déjà écrit, réutilisable commercialement.**
- **[Square-Zero-Labs/video-prompting-skill](https://github.com/Square-Zero-Labs/video-prompting-skill)** —
  skill agent qui « route requests to the correct workflow, identifies the target model
  (Ovi, Sora, Veo, Wan, Seedance, LTX), confirms input mode ». Guides Seedance 2.0, LTX-2/2.3,
  Sora, Veo 3/3.1, Wan 2.2, Ovi. C'est le **routeur** de l'idée C.
- geekjourneyx/awesome-ai-video-prompts (MIT), jnMetaCode/ai-shortfilm-prompts — déjà connus.

### 2.4 L'angle « pas un wrapper » est lui aussi occupé — par de la recherche publiée

Voir §3, mais résumé : la boucle *générer → juger avec un VLM → réécrire le prompt → régénérer*
est **VISTA, Google, CVPR 2026**.

**Conclusion antériorité : l'idée C n'a pas de zone vierge.** Produit, prompt-craft, open source,
routage, et même la version « intelligente » sont tous couverts.

---

## 3. Y a-t-il un angle défendable ? (la vraie question)

J'ai évalué les trois versions non-wrapper possibles. Deux échouent, une tient — mais pas seule.

### Version A — Le banc d'essai : mesurer objectivement l'adhérence avec un VLM juge

**Ce que ce serait.** Pour chaque vidéo générée, un modèle de vision compare *ce qui a été
demandé* à *ce qui a été produit*, et sort un score + un motif d'échec lisible
(« la caméra est restée statique », « le plan finit en plan large, pas en plan taille »).

**Antériorité :** dense, académique, mature.
- **VideoScore2** — annotations 1-5 sur **Semantic Adherence** et Physical Consistency
  ([arXiv](https://arxiv.org/html/2509.22799v1))
- **VBench / VBench-2.0** — le benchmark canonique, mesure le mouvement caméra via point-tracking
  CoTracker-v2, taxonomie à 9 types de mouvements
  ([GitHub](https://github.com/Vchitect/VBench) · [VBench-2.0](https://arxiv.org/html/2503.21755v1))
- **Q-Save** — scores par aspect + commentaires en langage naturel ([arXiv](https://arxiv.org/html/2511.18825v2))
- La technique exacte que tu utiliserais — *« prompt-specific checklists generated by an LLM
  agent, the fraction of checklist items satisfied derives an ordinal rating »* — est déjà
  la state of the art publiée.

**Faisable en 24 h ?** Oui, techniquement. ~3 h de travail : échantillonner 8-16 frames,
les envoyer à un VLM avec une checklist dérivée de l'intention, récupérer du JSON.
Coût négligeable (Gemini : 258 tokens/s de vidéo à 1 fps → un clip de 5 s ≈ 1 300 tokens ≈
0,0004 $). *(Note : certaines sources SEO annoncent « 0,15 $/s de vidéo en input » — c'est
incohérent de 3 ordres de grandeur avec le calcul en tokens ; à vérifier avant de budgéter,
mais dans les deux cas ce n'est pas le poste de coût.)*

**Défendable devant un jury ?** **Moyennement, et ça se retourne facilement.**
La première question d'un juré technique est *« qui juge le juge ? »*. Tu utilises un modèle
probabiliste pour arbitrer un modèle probabiliste, sans vérité-terrain. Sur le mouvement
caméra spécifiquement — le cas le plus vendeur — la littérature 2026 montre que les VLM sont
faibles ([CameraBench](https://openreview.net/forum?id=Wkss6Md6sv), *Probing into Camera
Control of Video Models*, [arXiv 2605.14815](https://arxiv.org/html/2605.14815)). Tu risques
d'afficher un score rouge sur une vidéo que le jury voit comme correcte. **C'est un risque de
démo actif, pas seulement un risque théorique.**

### Version B — La boucle : réécrire le prompt à partir de l'échec constaté

**Antériorité : ça existe, c'est nommé, c'est Google, et c'est à CVPR 2026.**

- **VISTA — A Test-Time Self-Improving Video Generation Agent** (Google, CVPR 2026).
  Décompose l'idée en plan temporel structuré → génère → tournoi par paires pour élire la
  meilleure vidéo → **trois agents critiques spécialisés (visuel / audio / contextuel)** →
  un agent de raisonnement synthétise et **réécrit le prompt** pour le cycle suivant.
  Jusqu'à 60 % de win rate pairwise, 66,4 % de préférence humaine.
  → [page projet](https://g-vista.github.io/) · [arXiv 2510.15831](https://arxiv.org/html/2510.15831v1) ·
    [CVPR 2026](https://openaccess.thecvf.com/content/CVPR2026/html/Long_VISTA_A_Test-Time_Self-Improving_Video_Generation_Agent_CVPR_2026_paper.html)
- **RAPO++** — Sample-Specific Prompt Optimization, boucle fermée avec feedback multi-source
  ([arXiv 2510.20206](https://arxiv.org/html/2510.20206))
- **VPO** — Aligning Text-to-Video Generation Models with Prompt Optimization, ICCV 2025
  ([PDF](https://openaccess.thecvf.com/content/ICCV2025/papers/Cheng_VPO_Aligning_Text-to-Video_Generation_Models_with_Prompt_Optimization_ICCV_2025_paper.pdf))
- **VQQA** — approche agentique d'évaluation + amélioration ([arXiv 2603.12310](https://arxiv.org/pdf/2603.12310))
- **VideoWeaver** (Zhejiang + ByteDance) — bibliothèque de skills réutilisables, **agent-as-judge**
  qui inspecte la trace d'exécution et la vidéo, et **algorithme d'évolution des skills à partir
  du feedback**. C'est mot pour mot le bonus « apprentissage de ce qui marche + bibliothèque de
  plans réutilisables » de l'idée C.
  → [arXiv 2606.08091](https://arxiv.org/abs/2606.08091) · [GitHub](https://github.com/JianhuiWei7/VideoWeaver)

**Faisable en 24 h ?** Le code, oui. **La démo, non.** Chaque itération = un cycle de génération
complet. 3 itérations × 3-5 min = **9 à 15 minutes**. Sur un pitch de 3 minutes, c'est
impossible à montrer en live. Tu montrerais un avant/après pré-enregistré — c'est-à-dire deux
vidéos et un texte. Le jury ne peut pas vérifier que la boucle existe.

**Défendable ?** Non. « On a réimplémenté un papier Google de CVPR 2026 en 24 h, mais on ne peut
pas vous le montrer tourner » est le pire des deux mondes.

### Version C — Adhérence contre **vérité-terrain 3D** ⭐ (la seule qui tient)

**L'idée.** Le problème des versions A et B, c'est l'absence de référence objective. Découpage
en fournit une **gratuitement** : la scène 3D *est* la vérité-terrain. On connaît la trajectoire
caméra exacte, la focale, la taille de plan, la position des acteurs dans le cadre — parce qu'on
les a écrits.

On peut donc mesurer, sans juge subjectif :

- **Écart structurel** — comparer la vidéo générée au rendu greybox/depth de contrôle, frame par
  frame (SSIM / IoU de silhouette / flot optique). Un nombre, calculable en local, gratuit,
  sans LLM. « On ne devine pas si le modèle a obéi. On sait, parce qu'on a le plan. »
- **Taille de plan** — le seul jugement qu'un VLM fait bien (large / moyen / gros plan), et on a
  la réponse attendue.
- **Franchissement d'axe** — la ligne des 180° est déjà tracée dans le plan de plateau
  (déjà prévu dans le PLAN.md de Découpage). Vérifiable géométriquement.

**Faisable en 24 h ?** La version SSIM/silhouette : **oui, ~2-3 h**, et elle est déterministe
donc non-flaky en démo. La version reconstruction de trajectoire caméra (VGGT / ViPE / ATE-RPE,
cf. [GeoT2V-Bench](https://arxiv.org/pdf/2606.24829)) : **non**, hors budget.

**Défendable ?** **Oui — mais ce n'est plus l'idée C.** C'est une feature de Découpage.
Elle n'a de sens *que* parce qu'un plan 3D existe en amont. Personne dans les dix produits du
§2.1 ne peut la copier, parce qu'aucun n'a de vérité-terrain géométrique.

> **Réponse à la question centrale : oui, il existe une version non-wrapper. Elle s'appelle
> Découpage + un vérificateur. Elle ne survit pas si on retire Découpage.**

---

## 4. Faisabilité en 24 h — chiffres

### Endpoints et prix (fal, sauf mention)

| Modèle | Prix/s | Coût d'un clip 5 s | Latence observée |
|---|---|---|---|
| **Kling 3.0** std / pro | 0,084 / 0,112 $ | **0,42 / 0,56 $** | 90-130 s |
| **Wan 2.7** (tarif plat, toutes résolutions) | 0,10 $ | **0,50 $** | n/c |
| **Veo 3.1** std 720p sans audio | 0,20 $ | **1,00 $** | 2-4 min |
| **Veo 3.1 Fast** 720p sans audio | 0,10 $ | **0,50 $** | plus rapide |
| **Veo 3.1** std **avec audio** | 0,40 $ | **2,00 $** | 2-4 min |
| **Seedance 2.0** t2v 720p | 0,3034 $ | **1,52 $** | 2-5 min nominal |
| **Seedance 2.0 Fast** 720p | 0,2419 $ | **1,21 $** | — |
| **Runway Gen-4.5** (API directe 25 cr/s à 0,01 $) | 0,25 $ | **1,25 $** | n/c |
| **Runway Gen-4.5** (via agrégateur) | 0,15 $ | **0,75 $** | n/c |
| **Sora 2** | — | — | ⚠️ **mort** (app coupée le 26/04/2026, **API arrêtée le 24/09/2026**) |

Sources : [fal Veo 3.1](https://fal.ai/models/fal-ai/veo3.1) · [fal Wan 2.7](https://fal.ai/wan-2.7) ·
[buildmvpfast — API costs juillet 2026](https://www.buildmvpfast.com/api-costs/ai-video) ·
[devtk — pricing 2026](https://devtk.ai/en/blog/ai-video-generation-pricing-2026/) ·
[Runway API pricing](https://docs.dev.runwayml.com/guides/pricing/) ·
[OpenAI deprecations](https://developers.openai.com/api/docs/deprecations)

### Coût par comparaison

- **4 modèles × 5 s** (Kling + Wan + Veo std + Seedance) ≈ **3,44 $**
- Config économique (Kling + Wan + Veo Fast + Seedance Fast) ≈ **2,63 $**
- 5 modèles avec Runway ≈ **4,44 $**
- **Avec la boucle de réécriture × 3 itérations : 8 à 13 $ par intention.**

Construire une démo décente demande 30 à 50 runs → **100 à 400 $ de crédits**. Sur un hackathon
où fal n'est pas sponsor (les sponsors sont Supabase, Cursor, CapCut), c'est de l'argent réel.

### Latence — le vrai tueur

Le temps de réponse est celui du **plus lent**, pas de la moyenne : **3 à 5 minutes** en régime
nominal. Et Seedance 2.0 est structurellement congestionné : *« demand spikes hard around
launches and **weekends**, free-tier jobs don't get priority »*, avec des jobs qui dépassent
10 min ou **timeout en échec** sous charge
([nemovideo — rate limit](https://www.nemovideo.com/blog/seedance-2-0-rate-limit) ·
[« too many users »](https://www.nemovideo.com/blog/seedance-2-0-too-many-users)).
**Le pitch est un dimanche après-midi. C'est exactement le pic.**

### Ce qui est réellement dur

1. **Rien, techniquement.** C'est le problème : 6-8 h de dev honnête, et pas une ligne difficile.
   Un jury technique le sent.
2. **Normaliser les schémas d'entrée** entre 5 fournisseurs (durée, ratio, seed, refs, audio) —
   fastidieux, non impressionnant, ~2 h.
3. **La gestion de la latence en UI** — skeletons, retries, résultats partiels. C'est le seul
   vrai travail d'ingénierie, et il est invisible.
4. **Faire tourner la démo live** — impossible de manière fiable (§5).

---

## 5. Le moment de démo — réponse honnête : il n'existe pas

**La grille de 4 vidéos côte à côte n'impressionne pas.** Trois raisons, sans complaisance :

1. **Le jury l'a déjà vue.** Higgsfield, Pollo, Krea, Flora et fal Sandbox affichent cette grille
   sur leur page d'accueil. Un juré de l'écosystème créatif parisien reconnaît le motif en
   5 secondes et classe mentalement le projet en « UI d'agrégateur ».
2. **Elle n'arrive pas.** 3 à 5 minutes d'attente minimum, un dimanche, sur un wifi de Station F,
   dans un pitch de 180 secondes. Tu seras obligé de pré-cuire les résultats — et une grille
   pré-cuite, c'est un diaporama. Le jury ne peut pas distinguer « on a construit une
   orchestration parallèle » de « on a téléchargé 4 mp4 ».
3. **Il n'y a pas de surprise.** Quatre vidéos qui jouent en même temps, c'est du bruit visuel.
   L'œil ne sait pas où regarder, et personne ne peut « voir » qu'un prompt a été recompilé.
   **Le travail du produit est invisible à l'écran.**

**Les seules 10 secondes qui pourraient marcher** (version A/C) :

> L'intention affichée en gros : *« la caméra recule et finit en plan taille »*.
> Les 4 vidéos jouent en boucle. Puis, au-dessus de chacune, un badge tombe :
> ❌ « caméra statique » · ❌ « finit en plan large » · ❌ « le sujet sort du cadre » · ✅ 94 %.
> Et la phrase : *« Trois des quatre modèles ne vous ont pas écouté. Vous ne le voyiez pas. »*

C'est **environ 4 secondes de vraie surprise**. C'est le meilleur qu'on puisse tirer de l'idée C,
et ça repose entièrement sur le verdict automatique — donc sur la version A, avec son risque de
juge qui se trompe en direct.

**Comparaison brutale avec Découpage :** « tu écris *contre-plongée, 85 mm, dolly avant* et la
caméra bouge sur l'écran, instantanément, en 3D » — c'est **0 seconde de latence, impossible à
pré-cuire, impossible à confondre avec un produit existant**. L'idée C n'a rien qui approche.

---

## 6. Le meilleur argument CONTRE (le vrai)

Le plus tranchant n'est ni l'antériorité ni la démo. C'est celui-ci :

> **Le mécanisme central du produit aggrave le pain point qu'il prétend résoudre.**

Le pain point n°1 identifié dans la recherche, c'est *« les créateurs brûlent des crédits et des
heures sur une génération-loterie »*. L'idée C ne réduit pas la loterie : **elle achète quatre
tickets au lieu d'un.** Elle multiplie le coût par ~8× (0,42 $ sur Kling seul → 3,44 $ en
comparaison 4 modèles), multiplie l'attente par le max au lieu de la moyenne, et laisse
l'utilisateur exactement là où il était : devant des sorties qu'il n'a pas dirigées, à choisir
la moins pire. **C'est de l'échantillonnage vendu comme de la direction.**

Les quatre arguments suivants, dans l'ordre :

2. **L'IP est un fichier `.md` sur GitHub sous CC BY 4.0.** La grammaire par modèle — le seul
   savoir propriétaire supposé — est [smixs/visual-skills](https://github.com/smixs/visual-skills),
   que tu lirais pendant le hackathon. Un juré qui connaît le repo demande « qu'avez-vous
   ajouté ? » et il n'y a pas de bonne réponse.

3. **Tu construirais un fal Sandbox moins bon, sur fal.** Le sandbox de ton propre fournisseur
   fait déjà « même input sur N modèles, side-by-side, avec enhance-prompt et estimation de
   coût ». Il est gratuit, plus rapide, et couvre des centaines de modèles.

4. **La couche d'agrégation est en train d'être mangée par les vendeurs.** Runway a shippé un
   **Model Router** (routage par coût / latence / qualité) directement dans son API. Le bonus
   « routage automatique selon l'intention » de l'idée C est déjà une feature native chez un
   des modèles que tu router-ais.

5. **C'est le projet modal du hackathon.** 50 builders, beaucoup produiront des « plateformes IA
   créatives unifiées ». L'idée C **est** cet archétype, dans sa version la moins différenciée.
   C'est la pire position possible : maximum de concurrence directe, minimum de signal distinctif.
   Et le track s'appelle **Tools for AI Artists** — un artiste n'a pas d'angoisse d'achat de
   modèle, il a une angoisse de raccord. L'argument « ne te marie pas à un modèle » est un
   argument d'acheteur, pas d'artiste.

*(Le seul contre-argument à ces contre-arguments : Sora 2 meurt le 24/09/2026, ce qui rend
l'argument « ne dépends pas d'un modèle » factuellement plus fort en 2026 qu'en 2025. Mais c'est
un argument de résilience d'infrastructure, et il ne se pitche pas en 3 minutes devant un jury
créatif.)*

---

## 7. Verdict

### **À écarter comme projet autonome.**

| Critère | Note | Raison |
|---|---|---|
| Nouveauté | ☠️ | 10 produits en prod, dont fal Sandbox et Higgsfield. Recherche publiée sur la version « intelligente » (VISTA, CVPR 2026). |
| Défendabilité | ☠️ | IP = un repo CC BY 4.0. Routage = feature native Runway. |
| Risque technique | ✅ | Quasi nul — et c'est justement le signal négatif : rien de dur = rien à montrer. |
| Moment de démo | ☠️ | Latence 3-5 min un dimanche de pic ; grille pré-cuite = diaporama ; travail invisible. |
| Cohérence avec le pain point | ☠️ | Multiplie le coût de la loterie au lieu de la supprimer. |
| Coût | ⚠️ | 2,63-4,44 $ / comparaison ; 100-400 $ pour construire la démo ; fal n'est pas sponsor. |

### Ce qu'il faut en garder — deux choses, précisément

1. **Le vérificateur d'adhérence contre vérité-terrain 3D** (version C, §3). C'est le seul
   fragment non-copiable, et il n'existe que grâce à Découpage. Budget : **2-3 h, en S5**,
   version déterministe (SSIM / silhouette contre le rendu greybox), pas de VLM juge.
   Bénéfice pitch : une phrase qui vaut cher — *« on ne devine pas si le modèle a obéi ;
   on a le plan, donc on mesure l'écart »*. Et ça se combine naturellement avec l'alerte 180°
   déjà prévue.
   **À couper sans hésiter si S1-S3 dérapent** — le film du dimanche matin passe avant.

2. **La grammaire par modèle comme dépendance, pas comme produit.** Fork
   [smixs/visual-skills](https://github.com/smixs/visual-skills) (CC BY 4.0, attribution à
   Serge Shima obligatoire) et branche-le sur le compilateur de direction de Découpage
   (S4, déjà au planning). Zéro heure de R&D sur la syntaxe Seedance/Kling/Veo — c'est écrit.
   **C'est une économie de temps, pas une feature à pitcher.**

### Ce qu'il ne faut PAS faire

- Ne pas ajouter un sélecteur multi-modèles à Découpage « parce que c'est facile ». Ça diluerait
  le message (« couverture ») dans le message le plus banal du hackathon (« tous les modèles au
  même endroit »), et ça coûterait 4× en crédits pour la démo.
- Ne pas tenter la boucle de réécriture VISTA-like. 9-15 min par cycle, impossible à montrer,
  et c'est un papier Google réimplémenté à moitié.

---

## Sources

**Produits / antériorité**
- [fal — Sandbox](https://fal.ai/docs/documentation/model-apis/sandbox) · [annonce Sandbox](https://x.com/tjack/status/1976436974484676915)
- [Higgsfield — AI Video (multi-modèles côte à côte)](https://higgsfield.ai/ai-video)
- [Pollo AI — text to video](https://pollo.ai/text-to-video) · [Pollo API platform](https://pollo.ai/api-platform/explore)
- [MoodNode](https://moodnode.ai/) · [MoodNode — comparatif Kling/Veo/Sora/Luma](https://moodnode.ai/blog/kling-vs-veo-vs-sora-vs-luma-2026)
- [Flora — review 2026](https://tooldirectory.ai/tools/flora) · [Krea — review 2026](https://www.tooljunction.io/ai-tools/krea)
- [Higgsfield vs OpenArt](https://promptsrush.com/blog/higgsfield-vs-openart)
- [Artificial Analysis — Text-to-Video Leaderboard](https://artificialanalysis.ai/video/leaderboard/text-to-video) · [HF Space](https://huggingface.co/spaces/ArtificialAnalysis/Video-Generation-Arena-Leaderboard)
- [LLM-Stats — best AI for video generation](https://llm-stats.com/leaderboards/best-ai-for-video-generation)
- [Runway — modèles dispo & Model Router](https://docs.dev.runwayml.com/guides/models/) · [release notes juillet 2026](https://releasebot.io/updates/runwayai)
- [HackerNoon — One Script, Five Dialects (le problème, à la main)](https://hackernoon.com/one-script-five-dialects-how-to-turn-a-screenplay-into-ai-video-prompts-for-any-tool)

**Open source**
- [smixs/visual-skills](https://github.com/smixs/visual-skills) (CC BY 4.0)
- [Square-Zero-Labs/video-prompting-skill](https://github.com/Square-Zero-Labs/video-prompting-skill)
- [Vchitect/VBench](https://github.com/Vchitect/VBench) · [JianhuiWei7/VideoWeaver](https://github.com/JianhuiWei7/VideoWeaver)

**Recherche (angle « pas un wrapper »)**
- [VISTA — Test-Time Self-Improving Video Generation Agent (Google, CVPR 2026)](https://g-vista.github.io/) · [arXiv 2510.15831](https://arxiv.org/html/2510.15831v1) · [CVPR](https://openaccess.thecvf.com/content/CVPR2026/html/Long_VISTA_A_Test-Time_Self-Improving_Video_Generation_Agent_CVPR_2026_paper.html)
- [VideoWeaver — arXiv 2606.08091](https://arxiv.org/abs/2606.08091)
- [RAPO++ — arXiv 2510.20206](https://arxiv.org/html/2510.20206) · [VPO — ICCV 2025](https://openaccess.thecvf.com/content/ICCV2025/papers/Cheng_VPO_Aligning_Text-to-Video_Generation_Models_with_Prompt_Optimization_ICCV_2025_paper.pdf) · [VQQA — arXiv 2603.12310](https://arxiv.org/pdf/2603.12310)
- [VideoScore2 — arXiv 2509.22799](https://arxiv.org/html/2509.22799v1) · [Q-Save — arXiv 2511.18825](https://arxiv.org/html/2511.18825v2) · [VBench-2.0 — arXiv 2503.21755](https://arxiv.org/html/2503.21755v1)
- [CameraBench / Towards Understanding Camera Motions](https://openreview.net/forum?id=Wkss6Md6sv) · [Probing into Camera Control — arXiv 2605.14815](https://arxiv.org/html/2605.14815) · [GeoT2V-Bench — arXiv 2606.24829](https://arxiv.org/pdf/2606.24829)

**Prix / latence**
- [buildmvpfast — AI video API pricing juillet 2026](https://www.buildmvpfast.com/api-costs/ai-video) · [devtk — pricing 2026](https://devtk.ai/en/blog/ai-video-generation-pricing-2026/)
- [fal — Veo 3.1](https://fal.ai/models/fal-ai/veo3.1) · [fal — Wan 2.7](https://fal.ai/wan-2.7) · [Runway API pricing](https://docs.dev.runwayml.com/guides/pricing/)
- [Seedance 2.0 — rate limits & délais](https://www.nemovideo.com/blog/seedance-2-0-rate-limit) · [« too many users »](https://www.nemovideo.com/blog/seedance-2-0-too-many-users)
- [magicshot — latences Kling / Veo / Seedance](https://magicshot.ai/blog/kling-vs-veo-vs-seedance-comparison)
- [OpenAI — deprecations (Sora 2 API, 24/09/2026)](https://developers.openai.com/api/docs/deprecations)

**Contexte hackathon**
- [Generathon — Luma](https://luma.com/wobryy3j) · [Demo Night 02/08](https://www.anopenroom.com/paris/fr/events/generathon-demo-night-0802-mrnoyq1a)
