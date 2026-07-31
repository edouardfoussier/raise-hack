# Dé-risquage — Idée B : « Joue la scène toi-même »

> Rapport d'antériorité et de faisabilité. Recherche web uniquement, aucun appel API, aucun proto.
> Rédigé le 31 juillet 2026, veille du Generathon.

---

## Verdict, tout de suite

**Non viable seule. Viable — et même précieuse — comme *mode d'entrée* de Découpage, à condition
d'en changer la sortie : la performance doit piloter le mannequin greybox, pas les pixels finaux.**

Trois raisons, dans l'ordre de dureté :

1. **L'antériorité est écrasante et récente.** Le geste exact « je me filme, l'IA met un samouraï à ma
   place » est le **discours marketing officiel de Runway Act-Two**, une **feature nommée chez
   Higgsfield** (Recast / Character Swap), **un endpoint à deux champs sur fal** (Kling 2.6 Motion
   Control : `image_url` + `video_url`), et le **cas d'usage d'ouverture de Luma Modify Video**, qui dit
   littéralement « un plan pris à l'arrache sur ton téléphone ». Ce n'est pas un risque de perception :
   c'est factuellement une feature commoditisée sur au moins cinq produits.
2. **Il n'y a pas de créneau de travail défendable en 24 h.** Le travail technique que tu ferais est
   soit *déjà fait par l'endpoint* (extraction pose/motion → 1 appel API, 2 h de build, zéro produit),
   soit *infaisable en 24 h* (trajectoire caméra monoculaire → ViPE tourne à 3-5 fps sur GPU, aucun
   endpoint hébergé trouvé sur fal ni Replicate). Il n'y a pas de milieu.
3. **La démo « live » ne tient pas dans 3 minutes.** Kling 2.6 Motion Control : médiane mesurée
   **~6,6 min (Pro) / ~9,6 min (Standard)**. Wan 2.2 Animate : **~223 s**. Le seul chemin sous la minute
   est Wan 480p accéléré (~50-65 s), et il faut encore y ajouter transfert téléphone → app + extraction
   + encodage sur un wifi de Station F. Best case honnête : **1 min 45**. Réaliste : **3 à 8 min.**

Et le clou, qui n'est pas un détail : **l'idée B standalone détruit la thèse gagnante.** Si c'est ton
téléphone qui définit le cadre, tu obtiens **un** plan. Tu perds la couverture, c'est-à-dire la seule
chose que personne d'autre ne sait faire et le seul argument qui distingue Découpage des 49 autres
équipes. Idée B seule te fait descendre du terrain où tu gagnes vers le terrain le plus encombré du
marché.

**Ce qu'il faut en garder** : la section 7 décrit la version qui, elle, *multiplie* la couverture au
lieu de la tuer — et c'est ~4 h de build, pas 24.

---

## 1. Le produit en une phrase, et le geste exact

**La phrase** : *« Tu joues la scène devant ton téléphone. On garde ton mouvement, ton timing et ton
cadre — on remplace tout le reste. »*

**Le geste utilisateur, version standalone (celle qu'on dé-risque) :**

| # | Étape | Ce qui se passe | Temps |
|---|---|---|---|
| 1 | Tu filmes | Tu joues l'action, ou tu bouges le téléphone pour tracer le mouvement caméra. 3-8 s, plan large ou taille, corps entier visible, pas d'occlusion. | 10-20 s |
| 2 | Tu envoies | QR code → page mobile → upload direct vers Supabase Storage. (Pas de WebXR sur iOS, donc pas de capture 6DoF dans le navigateur — voir §3.) | 10-60 s |
| 3 | Tu choisis la cible | Une image de perso (`@Image`) + un prompt de monde : *« un samouraï, désert de sel, heure dorée »*. | 15 s |
| 4 | On extrait | Pose (MediaPipe/DWPose) et/ou depth, rendus en vidéo de contrôle. **Ou pas** : Kling MC, Wan Animate, Act-Two et Luma prennent la vidéo brute. | 0-15 s |
| 5 | On génère | 1 appel : `fal-ai/kling-video/v2.6/*/motion-control` ou `fal-ai/wan/v2.2-14b/animate/replace` ou `fal-ai/wan-vace-14b/pose`. | 60 s → 10 min |
| 6 | Tu regardes | Le plan sort. Un seul angle : **celui de ton téléphone.** | — |

L'étape 6 est le problème structurel, pas un détail d'implémentation.

---

## 2. Antériorité — la section qui fait mal

### 2.1 Produits qui font exactement ça, aujourd'hui, en payant

| Produit | Ce qu'il fait | Verdict |
|---|---|---|
| **[Runway Act-Two](https://help.runwayml.com/hc/en-us/articles/42311337895827-Performance-Capture-with-Act-Two)** | Vidéo de performance + image de perso → animation. Corps, mains, visage, expression, voix, en une passe, 24 fps. Génère même le mouvement d'environnement quand la ref est une image. Sorti **juillet 2025**. | **☠️ Tueur.** Leur propre argumentaire commercial est ta phrase de pitch : *« si tu n'arrives pas à faire bouger un personnage comme tu veux, **filme-toi en train de faire l'action**, et la plateforme le traduit sur le personnage. »* |
| **[Kling 2.6 / 3.0 Motion Control](https://kling.ai/blog/ai-motion-transfer-video-tutorial)** | Vidéo de référence (3-30 s) + image de perso → transfert squelette, gestes, timing, mains, expressions, lip-sync. **Deux modes d'orientation** : `video` (recadre comme la ref) ou `image` (garde ton cadre, **suit le mouvement caméra de la ref**). | **☠️ Tueur, et disponible en API.** Sur fal : `image_url` + `video_url` + `character_orientation`. **Trois champs.** ([fal Pro](https://fal.ai/models/fal-ai/kling-video/v2.6/pro/motion-control) · [fal Standard](https://fal.ai/models/fal-ai/kling-video/v2.6/standard/motion-control/api)) |
| **[Luma Modify Video](https://lumalabs.ai/news/introducing-modify-video)** | *« Prends n'importe quelle séquence — live action, animation, performance, **ou un plan pris à l'arrache sur ton téléphone** — et transforme-la, sans perdre le mouvement d'origine ni la dynamique caméra. »* Web **et iOS**, jusqu'à 30 s. | **☠️ Tueur.** Le pitch d'Idée B est leur page produit, mot pour mot, y compris le téléphone. |
| **[Higgsfield Recast / Character Swap](https://geo.higgsfield.ai/task/blog/ai-video-tool-copy-motion-animated-character-1)** | Upload d'un vrai clip → remplacement de l'acteur par un perso IA, mouvement / lumière / atmosphère préservés. Plus [Kling Motion Control 3.0 intégré](https://higgsfield.ai/blog/kling-motion-control-3) depuis mars 2026. | **☠️ Tueur, et sponsor-adjacent.** Higgsfield est un acteur que le jury connaîtra. |
| **[Runway Aleph](https://www.cined.com/runway-aleph-ai-edits-real-footage-with-camera-angles-object-removal-and-relighting/)** | Édite de la vraie image : change l'angle caméra, relight, supprime des objets. Slider « Camera Angle » pour paner/tilter/dollyer. Marketing explicite : *« générer de la couverture infinie depuis un seul plan — larges, gros plans, contrechamps »*. | ⚠️ **À surveiller sérieusement** — c'est le seul concurrent qui attaque *aussi* le mot « couverture ». Mais il part d'un plan existant et n'a pas de plan de plateau : il devine la géométrie, il ne la connaît pas. |
| **[Seedance 2.0 reference-to-video](https://www.opus.pro/blog/replicate-camera-work-transitions-seedance)** | Jusqu'à 3 vidéos de ref (≤15 s au total), tag `@Video1` dans le prompt pour piquer la **grammaire caméra** : vitesse de dolly, orbite, timing de push-in, rack focus. | ⚠️ Le transfert de mouvement caméra depuis une vidéo est déjà une **feature de prompt**. ([guide WaveSpeed](https://medium.com/@social_18794/how-to-use-reference-video-in-seedance-2-0-to-copy-motion-camera-moves-6ee78dd117e7)) |
| **[Viggle](https://www.stork.ai/en/viggle-ai)** | Mix Mode : image de perso + vidéo de motion → réplication complète, multi-persos. Modèle JST-1. 4 M+ de membres Discord, 19 M$ levés (a16z). | ⚠️ Le *grand public* fait ça depuis 2024. Le côté « waouh » est usé. |

### 2.2 Le versant capture 3D — mature depuis des années

| Outil | Ce qu'il fait |
|---|---|
| **[Autodesk Flow Studio](https://help.wonderdynamics.com/ai-mocap-system/markerless-motion-capture/)** (ex-Wonder Studio) | Mocap markerless corps/visage/mains **+ [camera track](https://help.wonderdynamics.com/wonder-tools/camera-track-wt/)** depuis une caméra unique, en cloud. Export animation MetaHuman vers Unreal. Racheté par Autodesk en 2024. |
| **[Move.ai / Move One](https://www.fxguide.com/quicktakes/update-move-ai-releases-single-camera-motion-capture-app-move-one/)** | Mocap monocaméra depuis un simple clip smartphone. App iPhone dédiée. Freemium. |
| **[Meshcapade](https://meshcapade.com/)** | Capture monoculaire mono/multi-personnes, caméra fixe ou mobile. **Racheté par Epic Games en 2026.** |
| **[DeepMotion](https://aigearbase.com/tool/deepmotion)** | MP4 → animation 3D corps/visage/mains, multi-personnes, freemium. |

### 2.3 « Le téléphone comme caméra virtuelle » — libre, gratuit, et vieux

[vanjac/ar-recorder](https://github.com/vanjac/ar-recorder) (téléphone → contrôleur 6DoF Blender) ·
[cgtinker/blendartrack](https://github.com/cgtinker/blendartrack) ·
[Shopify/tracky](https://github.com/Shopify/tracky) (session ARKit complète → Blender : depth, masques,
pose, plans) · [CamTrackAR](https://www.cgchannel.com/2020/08/camtrackar-exports-3d-camera-tracks-to-blender-for-free/) (gratuit depuis 2020) ·
Byplay, VirtuCamera.

### 2.4 Le versant open source — totalement commoditisé

Il existe une **[revue de littérature dédiée](https://arxiv.org/pdf/2509.03883)** (*Human Motion Video
Generation: A Survey*, 2025). Les implémentations libres :
[Tencent/MimicMotion](https://github.com/Tencent/MimicMotion) (ICML 2025) ·
[StableAnimator](https://github.com/Francis-Rings/StableAnimator) (CVPR 2025) ·
UniAnimate-DiT · Champ · DreamActor-M1/V2 ·
[MultiAnimate](https://github.com/hyc001/MultiAnimate) (CVPR 2026) ·
[Wan 2.2 Animate](https://wan.video/blog/wan2.2-animate) — animation **et** remplacement, 720p jusqu'à
120 s, dispo sur [fal](https://fal.ai/models/fal-ai/wan/v2.2-14b/animate/replace) et
[Replicate](https://replicate.com/wan-video/wan-2.2-animate-replace).

### 2.5 Le coup de grâce : PrevizWhiz fait déjà l'idée B, comme sous-feature

Le papier que vous citez déjà comme validation du besoin —
**[PrevizWhiz, Autodesk Research, CHI 2026](https://www.research.autodesk.com/publications/previzwhiz-combining-rough3d-scenes-2dvideo-generative-video-previsualization/)**
([ACM](https://dl.acm.org/doi/10.1145/3772318.3790534) · [arXiv 2602.03838](https://arxiv.org/abs/2602.03838)) —
s'appelle littéralement *« Combining Rough 3D Scenes **and 2D Video** to Guide Generative Video
Previsualization »*.

Son mode d'entrée secondaire : *« les utilisateurs peuvent importer des vidéos externes (vidéos en
ligne **ou séquences qu'ils ont filmées eux-mêmes**) comme référence dans le panneau Video Playground »*,
avec extraction de références pose/depth et composition multimodale pour la génération.

**Traduction** : le laboratoire de recherche d'Autodesk a construit exactement Découpage, et à
l'intérieur, l'idée B **est l'onglet numéro deux**. C'est simultanément :
- ❌ la preuve qu'Idée B n'est pas un produit — c'est un mode d'entrée ;
- ✅ la preuve que la combinaison est la bonne architecture, publiée et évaluée avec de vrais
  réalisateurs à CHI.

**Est-ce que quelque chose tue l'idée ?** Oui. Act-Two, Kling MC, Luma Modify et Higgsfield Recast la
tuent comme *produit*. PrevizWhiz la classe comme *feature*.

---

## 3. Faisabilité 24 h — chiffres, endpoints, et le vrai mur

### 3.1 Les chemins de génération (coût pour un plan de 5 s)

| Endpoint | Entrées | Prix | Latence observée | Note |
|---|---|---|---|---|
| `fal-ai/kling-video/v2.6/standard/motion-control` | `image_url`, `video_url`, `character_orientation` | **0,07 $/s** → **0,35 $** | **~9,6 min médiane** ([mesure WaveSpeed](https://wavespeed.ai/models/kwaivgi/kling-v2.6-std/motion-control)) | Meilleure qualité. Contraintes d'entrée strictes. |
| `fal-ai/kling-video/v2.6/pro/motion-control` | idem | **0,112 $/s** → **0,56 $** | **~6,6 min médiane**, plage annoncée **5-30 min** | Le Pro est *plus rapide* que le Standard : c'est de la file d'attente, donc imprévisible. |
| `fal-ai/wan/v2.2-14b/animate/replace` | image perso + vidéo | ~tarif Wan | **~223 s médiane** ([WaveSpeed](https://wavespeed.ai/models/wavespeed-ai/wan-2.2/animate)) | Mode `animate` + mode `replace`. |
| `fal-ai/wan-vace-14b/pose` | **vidéo de squelette pré-rendue** + prompt | **0,04 $/s** 480p · 0,06 $ 580p · 0,08 $ 720p → **0,20 $** en 480p | **~1 min** (chiffre de votre recherche ; [Wan 480p accéléré mesuré à 50-65 s](https://wavespeed.ai/models/wavespeed-ai/wan-2.1/i2v-480p-lora-ultra-fast)) | **Le seul chemin compatible avec une démo live.** |

**Budget** : à 0,20-0,56 $ le plan, 200 générations sur le week-end = 40 à 110 $. Le coût n'est pas le
risque. La **latence** l'est.

### 3.2 Extraction de pose dans le navigateur — faisable, mais c'est un piège

- **[MediaPipe Pose Landmarker Web](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js)**
  (`@mediapipe/tasks-vision`) : 33 landmarks, 30+ fps sur webcam standard, `detectForVideo()`,
  coordonnées 2D **et** monde 3D. **Ça marche, c'est 1-2 h.**
- **Le piège** : MediaPipe sort du **BlazePose 33 points**. `wan-vace-14b/pose` attend un squelette
  **OpenPose / COCO 18-25 points**, dessiné dans la convention de couleurs exacte d'OpenPose. C'est un
  remap + un renderer canvas fidèle. Le classique trou noir de 3 h, avec un mode d'échec silencieux :
  ça a l'air bon à l'œil, le modèle génère de la bouillie.
- **[DWPose](https://github.com/IDEA-Research/DWPose)** (le préprocesseur que le monde ComfyUI utilise
  réellement) est distribué en ONNX. Le faire tourner en `onnxruntime-web` est *théoriquement* possible
  (WebGPU/WASM), mais aucun portage navigateur public n'a été trouvé — pré/post-traitement à réécrire
  en JS. **Ne fais pas ça un samedi soir.**
- **Le raccourci honnête** : Kling MC, Wan Animate, Act-Two et Luma prennent la **vidéo brute**. Toute
  cette section devient inutile — ce qui est exactement le problème. Le seul travail technique visible
  que tu pouvais montrer, l'endpoint te l'enlève.

### 3.3 Trajectoire caméra monoculaire — **non, pas en 24 h**

C'était la seule moitié potentiellement différenciante. Elle ne passe pas.

- **[NVIDIA ViPE](https://github.com/nv-tlabs/vipe)** ([page recherche](https://research.nvidia.com/labs/toronto-ai/vipe/)) —
  intrinsèques + mouvement caméra + depth dense quasi-métrique depuis une vidéo brute non contrainte.
  Bat les baselines de 18-50 % sur TUM/KITTI. **Tourne à 3-5 fps sur un GPU** (v1.2.0, juin 2026 :
  ×2,7 plus rapide). Donc ~30 s de calcul pour 5 s de vidéo — *si tu as un GPU déployé*. Tu n'en as pas.
  **Aucun endpoint hébergé trouvé sur fal ni Replicate.** Déployer ViPE toi-même samedi = ton hackathon
  est fini.
- **[MegaSaM](https://mega-sam.github.io/)** ([arXiv](https://arxiv.org/abs/2412.04463)) — meilleure
  précision de pose que ViPE, mais passe par une optimisation, donc plus lent, et en échelle ambiguë.
  Même conclusion.
- **WebXR sur iPhone : ça n'existe pas.** [Safari n'expose toujours pas le WebXR AR handheld en
  2026](http://xrdoctors.pro/blog/webxr-on-ios-what-actually-works). Pas de `getViewerPose()`, pas de
  6DoF navigateur. 8th Wall contourne avec son propre SLAM en WASM — produit commercial, pas une
  dépendance de hackathon.
- **Gyroscope seul** : `DeviceOrientationEvent.requestPermission()`
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static))
  marche sur iOS ≥13, mais exige HTTPS + activation transitoire (clic), diverge entre Chrome Android et
  Safari, n'est pas « Baseline », et surtout : **3DoF seulement**. Tu obtiens pan et tilt. Pas de dolly,
  pas de travelling, pas d'orbite — c'est-à-dire pas les mouvements qui impressionnent.

**Les deux seules triches réalistes en 24 h**, à assumer comme telles :

1. **Flux optique → classification du mouvement.** Homographie 2D grossière image à image → classer en
   primitive de mouvement, puis **quantifier** vers un mouvement paramétrique propre dans la scène 3D.
   ~3 h. Utilise la taxonomie de **[CameraBench](https://github.com/sy77777en/CameraBench)** (NeurIPS
   2025 Spotlight, construite *avec des chefs opérateurs* : dolly / pedestal / truck / pan / tilt / roll
   / zoom / arc / tracking) — ça donne un vocabulaire crédible et citable.
2. **Classification par VLM.** 8 frames → Claude → *« push-in lent avec léger tilt vers le haut »* → le
   solveur de Découpage produit le mouvement. ~1 h. Grossier, mais honnête, et le discours est bon :
   *« on ne copie pas ton tremblement, on lit ton intention et on la rejoue proprement. »*
   Note de prudence, tirée de CameraBench lui-même : *« les modèles SfM peinent sur les primitives
   sémantiques ; les VLM peinent sur les primitives géométriques. »* Attends-toi à ~70 % de justesse.

### 3.4 La plomberie qu'on sous-estime toujours

- **Téléphone → app** : QR → page mobile → upload Supabase. ~2 h à faire proprement, plus les
  permissions caméra iOS. Ennuyeux, incompressible, invisible au jury.
- **Contraintes d'entrée de Kling MC** (documentées) : personnage réaliste, corps entier ou buste **avec
  la tête**, sans occlusion, occupant **> 5 % de l'image**. Sur une scène en contre-jour, filmé par un
  coéquipier stressé : mode d'échec parfaitement plausible.
- **Le wifi de Station F.** Upload de 15-25 Mo un dimanche à 17 h 30 dans une salle pleine.

---

## 4. Le moment de démo — et pourquoi il ne survit pas

**Les 10 secondes que tu vises, écrites honnêtement :**

> Tu poses le laptop. Tu prends deux pas de recul, en plein cadre. Tu lèves lentement le bras droit
> comme si tu dégainais, tu pivotes de trois quarts, tu marques un temps d'arrêt. Un coéquipier tient
> le téléphone. Silence dans la salle.
> Tu reviens à l'écran. À droite, le clip brut : toi, en sweat, dans une salle de Station F.
> À gauche, le même geste, à la frame près, même timing, même arrêt — un samouraï, désert de sel,
> heure dorée. **Ton temps d'arrêt est là.** C'est ça le déclic : le jury reconnaît *ton* rythme dans
> le corps de quelqu'un d'autre.

**C'est un bon moment. Voici les quatre raisons pour lesquelles tu ne l'auras pas :**

1. **La latence.** Best case absolu : 15 s de jeu + 20 s d'upload + 10 s d'extraction + 60 s de
   génération = **1 min 45**. Sur ton pitch de **3 min**, tu viens de brûler 58 % du temps sur une
   barre de progression. Avec Kling MC (le chemin qui *rend bien*), c'est 6 à 10 min : **impossible.**
2. **Le fond de scène.** Tu obtiens *un* plan, sous *ton* angle. Le jury vient de voir douze équipes
   montrer un plan. Ton avantage — trois angles qui raccordent — n'apparaît nulle part.
3. **La reconnaissance.** Un juré qui a ouvert Runway, Higgsfield ou Kling une fois en 2026 pense
   *« Act-Two »* à la seconde 12. Tu passeras la question-réponse à défendre ta différence au lieu de
   l'amplifier.
4. **La variance humaine.** Ta démo dépend de ta capacité à mimer un dégainage de sabre devant 50
   builders et un jury, à 17 h 30, après 24 h sans dormir. Ça peut être formidable. Ça peut aussi être
   le moment le plus gênant de la journée. **Tu ne peux pas répéter ce risque à zéro.**

**Le seul montage qui marcherait** (à noter même si on écarte l'idée) : tu joues la scène **à la
seconde 5** du pitch, tu lances la génération, **tu ne la regardes pas**, tu fais tes 2 min 40 de pitch
par-dessus, et tu révèles à la fin. La génération devient le suspense au lieu du temps mort. C'est une
bonne structure — **et elle est réutilisable telle quelle dans la démo de Découpage.** Garde-la.

---

## 5. Le meilleur argument CONTRE — sans amortisseur

**Idée B est un endpoint à trois champs déguisé en produit, et elle te fait quitter le seul terrain où
tu peux gagner.**

Détaillons, parce que chaque partie est indépendamment suffisante.

**a) Il n'y a rien à construire.** Le produit minimum est : deux uploads et un POST vers
`fal-ai/kling-video/v2.6/pro/motion-control` avec `image_url` et `video_url`. C'est deux heures. Tout
ce que tu ajoutes ensuite pendant 22 h est soit de l'UI autour d'un appel API, soit une réimplémentation
moins bonne de ce que l'endpoint fait déjà. Le jury n'a pas besoin d'être malin pour le voir — il lui
suffit d'avoir ouvert fal une fois. **Et l'inverse du reproche « wrapper » n'est pas disponible** : la
seule pièce vraiment difficile et vraiment tienne (la trajectoire caméra) est celle qui ne rentre pas
dans 24 h.

**b) Le problème que tu résous n'est pas le bon problème.** Le pain point n°1 de 2026, celui que ta
propre recherche a établi, c'est la **loterie** et l'**absence de couverture**. Idée B ne touche ni
l'une ni l'autre : elle remplace un tirage aléatoire par une contrainte, certes, mais **une contrainte
unique et non réutilisable**. Tu ne peux pas rejouer la même performance depuis un autre angle. Pour
avoir un contrechamp, il faut retourner te filmer — et là tu as changé d'action, de timing, de
lumière. **Tu as réintroduit exactement la loterie que Découpage élimine.**

**c) Ça inverse la hiérarchie du contrôle.** Découpage dit : *la scène est la vérité, la caméra est une
variable*. Idée B dit : *ton clip est la vérité, tout le reste est une variable*. La deuxième version
est plus facile à démontrer et strictement moins puissante — c'est un plan, pas un découpage. Tu
troques un produit contre un tour de magie.

**d) L'effet « waouh » est daté.** Viggle a fait ça à 4 millions de personnes sur Discord en 2024. Le
transfert de mouvement est le contenu TikTok par défaut depuis deux ans. Devant un jury 2026, ça ne
provoque pas de la surprise, ça provoque de la reconnaissance — et la reconnaissance, pour un jury,
c'est le contraire d'une note.

**e) Le contre-argument évident ne tient pas non plus.** On pourrait dire : *« oui mais nous on le fait
en navigateur, gratuit, sans compte Runway »*. Un jury de hackathon ne récompense pas la
désintermédiation d'un abonnement à 15 $. Et Luma Modify est sur iOS. Et Higgsfield est sur iOS et
Android. L'accessibilité n'est pas le trou.

**Le test décisif** : demande-toi ce que tu réponds quand un juré dit *« en quoi c'est différent
d'Act-Two ? »*. Pour Idée B seule, il n'y a pas de bonne réponse — au mieux « c'est intégré à un
éditeur », ce qui est un aveu que le produit est l'éditeur, pas le transfert. Pour Découpage, la réponse
est immédiate et imparable : *« Act-Two vous donne un plan. On vous donne une scène, et quatre façons de
la couvrir. »*

---

## 6. Ce qui reste vrai — le seul angle réellement inoccupé

Par honnêteté intellectuelle : il y a **une** chose que personne ne vend.

Tous les produits recensés transfèrent soit du **mouvement de corps** (Act-Two, Kling MC, Wan Animate,
Viggle, Higgsfield Recast), soit du **mouvement d'image entière** (Luma Modify, Aleph, Seedance
`@Video1`). **Aucun ne transforme ton geste en un *paramètre de caméra réutilisable*** — un chemin de
dolly que tu peux ensuite appliquer à trois caméras différentes dans la même scène, ou ajuster à la
main, ou réutiliser au plan suivant.

L'écart tient en une phrase : **partout ailleurs le téléphone est une marionnette. Il devrait être un
viseur.**

C'est réel, c'est petit, et — c'est le point crucial — **ça n'a de valeur qu'à l'intérieur d'un système
qui possède une scène 3D**. Sans plan de plateau derrière, un « paramètre de caméra réutilisable » ne
veut rien dire. Cet angle n'est donc pas un argument pour Idée B seule ; c'est une démonstration
qu'Idée B a besoin de Découpage pour exister.

---

## 7. La version à garder — « Mode Performance », ~4 h de build

Une seule modification transforme un doublon en multiplicateur :

> **La vidéo du téléphone ne pilote pas les pixels. Elle pilote le mannequin greybox.**

Le pipeline :

1. Tu joues l'action devant la webcam ou le téléphone (3-8 s).
2. **MediaPipe Pose Web** → 33 landmarks, coordonnées monde 3D, dans le navigateur, temps réel.
3. Ces landmarks pilotent un **mannequin greybox** de la scène Three.js — le blocking et le timing
   deviennent les tiens.
4. **Les caméras restent les tiennes.** Tu en as toujours trois. La passe depth part comme prévu vers
   `fal-ai/wan-vace-14b/depth`.
5. Tu obtiens **N angles de ta propre performance**, qui raccordent.

Pourquoi c'est la bonne version :

- ✅ **Ça multiplie la couverture au lieu de la tuer.** *« Joue-le une fois. Récupère-le sous quatre
  angles. »* Cette phrase est meilleure que tout ce que produit l'Idée B standalone — et elle est
  littéralement impossible chez Act-Two, Kling, Luma et Higgsfield, par construction : eux n'ont pas de
  scène.
- ✅ **Ça élimine la faiblesse assumée de Découpage** — les mannequins statiques (cut line n°4 du plan).
  Elle passe de « limitation qu'on espère que personne ne remarque » à « feature qu'on démontre ».
- ✅ **Ça évite tous les murs du §3** : pas de format OpenPose (les landmarks pilotent une armature
  Three.js, pas un préprocesseur), pas de trajectoire monoculaire, pas de WebXR, pas d'upload
  téléphone si tu utilises la webcam du laptop. **La démo est en temps réel, à 0 $ et 0 s de latence** —
  parce que la génération vient *après*, dans le pipeline existant.
- ✅ **Ça se cite bien.** *« PrevizWhiz, à CHI cette année, a montré que combiner blocking 3D rough et
  référence vidéo 2D fait tomber la barrière technique de la previz. Ils l'ont publié. Nous, on l'a
  mis dans un navigateur, et on y a ajouté ce qui leur manquait : la couverture. »*
- ⚠️ **Coût réaliste** : 3-5 h (retarget des landmarks vers un rig simple + lissage + enregistrement/
  replay). À placer en **S5**, après que le multi-caméras marche. **Jamais avant.**

**Le moment de démo révisé, et il est meilleur :** tu te lèves devant la webcam, tu fais le geste — et
**le mannequin gris à l'écran le fait avec toi, en direct, dans les trois vues caméra simultanément**.
Zéro latence, zéro appel API, zéro risque de wifi. *Puis* tu génères. C'est plus impressionnant que
l'Idée B standalone **et c'est plus sûr**, ce qui n'arrive presque jamais.

---

## 8. Récapitulatif décisionnel

| Question | Réponse |
|---|---|
| Idée B est-elle nouvelle ? | **Non.** ≥5 produits l'expédient, dont un (Act-Two) dont c'est le pitch officiel. |
| Est-elle faisable en 24 h ? | **La version triviale, oui — en 2 h. La version différenciante, non.** |
| Le jury verra-t-il un wrapper ? | **Oui, et il aura raison** : l'endpoint fait trois champs. |
| La démo live tient-elle en 3 min ? | **Non.** 1 min 45 best case, 3-8 min réaliste. |
| Renforce-t-elle Découpage ? | **Seulement si la performance pilote le mannequin, pas les pixels.** Sinon elle le contredit. |
| **Verdict** | **Viable uniquement comme feature de Découpage** (« Mode Performance », S5, 3-5 h). **À écarter comme projet autonome.** |

Une dernière remarque, hors mission mais je ne peux pas la taire : la vraie menace repérée pendant
cette recherche n'est pas sur l'Idée B, c'est **Runway Aleph**, qui utilise publiquement le mot
« couverture » (*« générer de la couverture infinie depuis un seul plan — larges, gros plans,
contrechamps »*). Ce n'est pas fatal — Aleph *devine* la géométrie d'un plan existant, Découpage la
*connaît* et la met en scène avant de tourner — mais **il faut avoir la réponse prête**, parce que si
un juré la pose et que vous hésitez, c'est là que ça se joue, pas sur l'Idée B.
Formulation suggérée : *« Aleph reconstruit ce qui a déjà été filmé. Nous, on décide ce qui va l'être.
L'un est un outil de post-production, l'autre est un outil de mise en scène. »*

---

## Sources

**Produits — transfert de performance**
[Runway Act-Two (doc officielle)](https://help.runwayml.com/hc/en-us/articles/42311337895827-Performance-Capture-with-Act-Two) ·
[Runway Aleph — CineD](https://www.cined.com/runway-aleph-ai-edits-real-footage-with-camera-angles-object-removal-and-relighting/) ·
[Kling 2.6 Motion Control (blog officiel)](https://kling.ai/blog/ai-motion-transfer-video-tutorial) ·
[Kling MC — RunDiffusion](https://learn.rundiffusion.com/kling-2-6-motion-control-total-motion-transfer/) ·
[Luma — Introducing Modify Video](https://lumalabs.ai/news/introducing-modify-video) ·
[Luma — doc Modify Video](https://lumaai-help.freshdesk.com/support/solutions/articles/151000220119-how-do-i-use-modify-video-to-transform-footage-while-preserving-motion-) ·
[Higgsfield — Kling Motion Control 3.0](https://higgsfield.ai/blog/kling-motion-control-3) ·
[Higgsfield Recast / Character Swap](https://geo.higgsfield.ai/task/blog/ai-video-tool-copy-motion-animated-character-1) ·
[Viggle — review 2026](https://www.stork.ai/en/viggle-ai) ·
[Seedance 2.0 — camera work depuis vidéo de ref (OpusClip)](https://www.opus.pro/blog/replicate-camera-work-transitions-seedance) ·
[Seedance 2.0 — guide `@Video1` (WaveSpeed)](https://medium.com/@social_18794/how-to-use-reference-video-in-seedance-2-0-to-copy-motion-camera-moves-6ee78dd117e7)

**Mocap / capture 3D**
[Autodesk Flow Studio — markerless mocap](https://help.wonderdynamics.com/ai-mocap-system/markerless-motion-capture/) ·
[Autodesk Flow Studio — Camera Track](https://help.wonderdynamics.com/wonder-tools/camera-track-wt/) ·
[Move One — fxguide](https://www.fxguide.com/quicktakes/update-move-ai-releases-single-camera-motion-capture-app-move-one/) ·
[Meshcapade](https://meshcapade.com/) ·
[DeepMotion](https://aigearbase.com/tool/deepmotion)

**Téléphone → caméra 3D**
[vanjac/ar-recorder](https://github.com/vanjac/ar-recorder) ·
[cgtinker/blendartrack](https://github.com/cgtinker/blendartrack) ·
[Shopify/tracky](https://github.com/Shopify/tracky) ·
[CamTrackAR (CG Channel)](https://www.cgchannel.com/2020/08/camtrackar-exports-3d-camera-tracks-to-blender-for-free/)

**Open source / recherche**
[PrevizWhiz — Autodesk Research](https://www.research.autodesk.com/publications/previzwhiz-combining-rough3d-scenes-2dvideo-generative-video-previsualization/) ·
[PrevizWhiz — ACM CHI 2026](https://dl.acm.org/doi/10.1145/3772318.3790534) ·
[PrevizWhiz — arXiv 2602.03838](https://arxiv.org/abs/2602.03838) ·
[Human Motion Video Generation: A Survey](https://arxiv.org/pdf/2509.03883) ·
[Tencent/MimicMotion](https://github.com/Tencent/MimicMotion) ·
[StableAnimator](https://github.com/Francis-Rings/StableAnimator) ·
[MultiAnimate (CVPR 2026)](https://github.com/hyc001/MultiAnimate) ·
[Wan 2.2 Animate](https://wan.video/blog/wan2.2-animate) ·
[NVIDIA ViPE (GitHub)](https://github.com/nv-tlabs/vipe) ·
[ViPE — page recherche](https://research.nvidia.com/labs/toronto-ai/vipe/) ·
[MegaSaM](https://mega-sam.github.io/) · [MegaSaM — arXiv](https://arxiv.org/abs/2412.04463) ·
[CameraBench (NeurIPS 2025 Spotlight)](https://github.com/sy77777en/CameraBench) ·
[CameraBench — page projet](https://linzhiqiu.github.io/papers/camerabench/) ·
[DWPose](https://github.com/IDEA-Research/DWPose)

**API / navigateur**
[fal — Kling MC Pro](https://fal.ai/models/fal-ai/kling-video/v2.6/pro/motion-control) ·
[fal — Kling MC Standard (schéma API)](https://fal.ai/models/fal-ai/kling-video/v2.6/standard/motion-control/api) ·
[fal — Wan VACE 14B pose](https://fal.ai/models/fal-ai/wan-vace-14b/pose) ·
[fal — Wan 2.2 Animate Replace](https://fal.ai/models/fal-ai/wan/v2.2-14b/animate/replace) ·
[Replicate — wan-2.2-animate-replace](https://replicate.com/wan-video/wan-2.2-animate-replace) ·
[WaveSpeed — Wan 2.2 Animate (latence médiane)](https://wavespeed.ai/models/wavespeed-ai/wan-2.2/animate) ·
[WaveSpeed — Kling v2.6 Std MC (latence médiane)](https://wavespeed.ai/models/kwaivgi/kling-v2.6-std/motion-control) ·
[WaveSpeed — Wan 480p LoRA Ultra Fast](https://wavespeed.ai/models/wavespeed-ai/wan-2.1/i2v-480p-lora-ultra-fast) ·
[MediaPipe Pose Landmarker Web](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js) ·
[WebXR sur iOS en 2026](http://xrdoctors.pro/blog/webxr-on-ios-what-actually-works) ·
[MDN — DeviceOrientationEvent.requestPermission()](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static)

> **Note de fiabilité** : les latences médianes viennent des pages modèles WaveSpeedAI, qui publient
> des mesures end-to-end réelles — mais WaveSpeed est un concurrent de fal, donc les chiffres sur fal
> peuvent différer. L'ordre de grandeur (Kling MC = **minutes**, VACE 480p = **~1 minute**) est en
> revanche confirmé par plusieurs sources indépendantes et suffit à la décision. Les tarifs fal n'ont
> pas pu être vérifiés directement (403 egress depuis ce conteneur) : ils proviennent d'extraits de
> recherche des pages fal et concordent avec vos relevés antérieurs.
