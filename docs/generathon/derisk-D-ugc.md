# Dé-risquage — Idée D : l'angle UGC / CapCut

> Rapport de décision, 31 juillet 2026. Recherche web uniquement, aucun prototype.
> Question posée : est-ce que l'angle « outil UGC positionné pour le sponsor CapCut » bat **Découpage** ?

---

## VERDICT (en tête)

**À écarter comme produit autonome. À conserver comme *une seule* feature de Découpage : l'export vers un projet CapCut éditable.**

Trois raisons, par ordre de brutalité :

1. **Tu pitcherais un Arcads dégradé, à Paris, où Arcads est basé** (15 M$ ARR, 16 M$ levés chez Eurazeo en décembre 2025, 6 000 clients, 100 000 vidéos/mois). Une partie de la salle connaît la boîte.
2. **Le positionnement exact de l'idée D a déjà tué une startup financée** : Icon, pitchée littéralement comme « *like ChatGPT + CapCut, but for making winning ads* », backée par Founders Fund, 12 M$ dépensés sur le domaine icon.com — **en faillite en mars 2026**.
3. **Le sponsor que tu cherches à séduire vend déjà ton produit deux fois** : Pippit (équipe CapCut, Seedance 1.5 pro) et CapCut Video Studio (lancé le 25 mars 2026, workspace sans timeline, agent storyboard, *omni reference* pour la consistance).

**MAIS** — la recherche a produit un résultat non trivial et exploitable : **il existe une vraie surface technique CapCut**, et personne dans la salle ne saura qu'elle existe. Ce n'est pas un produit, c'est un bouton d'export. Il se greffe sur Découpage en ~3 h et il achète l'alignement sponsor **sans sacrifier le positionnement « Tools for AI Artists »**. C'est le seul morceau de l'idée D qui vaut quelque chose.

---

## 1. Existe-t-il une surface technique CapCut ? — OUI, mais pas celle qu'on croit

### 1.1 Ce qui n'existe PAS (tranché)

| Surface | Statut | Preuve |
|---|---|---|
| API REST publique de rendu / montage | **N'existe pas** | [json2video — CapCut API alternative](https://json2video.com/how-to/capcut-api/) : « CapCut does not offer a public API for automated video rendering, caption generation, or batch processing » (constat daté du 15 avril 2026) |
| « CapCut Open Platform » | Existe, mais **limité aux plugins tournant *dans* l'éditeur** — aucun endpoint serveur | même source ; [samautomation](https://samautomation.work/capcut-api/) (403 en fetch, résumé via recherche) |
| Portail développeur, signup clé API | **Introuvable.** Les pages `capcut.com/explore/ai-api` et `pippit.ai/templates/api-introduction` sont dans les répertoires SEO de CapCut (`/explore/`, `/templates/`) — pages marketing sans référence d'endpoints ni auth. *Non vérifiable directement : les deux renvoient 403 en fetch.* | [capcut.com/explore/ai-api](https://www.capcut.com/explore/ai-api) · [pippit.ai/templates/api-introduction](https://www.pippit.ai/templates/api-introduction) |
| Deep-link de template programmable | **Mobile uniquement**, non documenté, ni Web ni Desktop | [CapCut Help — Template jump exception](https://www.capcut.com/help/template-jump-exception) ; [nemovideo](https://www.nemovideo.com/blog/tiktok-capcut-template-link) |
| API Pippit | Aucune doc technique réelle trouvée. Pippit est un produit end-user (B2C/e-commerce), pas une plateforme dev | [Wikipedia — Pippit](https://en.wikipedia.org/wiki/Pippit) |

### 1.2 Ce qui existe VRAIMENT : le format de projet (draft)

C'est là que tout se joue. **CapCut stocke ses projets en JSON clair sur le disque**, et un écosystème open-source mature sait les écrire.

**Le format :**
- Windows : `C:\Users\<user>\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\<projet>\draft_content.json`
- macOS : `~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<projet>/draft_info.json`
- Structure : les segments d'une piste ne contiennent pas leur média — ils portent un `material_id` (UUID) pointant vers les tableaux `materials.<catégorie>[]`. Le champ `platform.app_source` distingue `"cc"` (CapCut International) de `"lv"` (JianYing/Chine).
- **Chiffrement — le point critique** : **CapCut International 6.x–9.x reste en JSON clair**. **JianYing (version chinoise) 6.0+ chiffre** `draft_content.json` et `draft_meta_info.json` à chaque sauvegarde, sans retour arrière possible.
→ [Cheat sheet du schéma draft_content.json (renezander030)](https://gist.github.com/renezander030/80823f1d47081c312d2c1f9edd20dc22)

**Les outils open-source qui écrivent ce format :**

| Projet | Étoiles | Licence | Ce qu'il fait |
|---|---|---|---|
| [sun-guannan/VectCutAPI](https://github.com/sun-guannan/VectCutAPI) (ex-**CapCutAPI**) | 2,1 k ★ / 460 forks | Apache-2.0 | HTTP API + serveur MCP. `create_draft`, `add_video`, `add_text`, `add_audio`, `add_image`, `add_subtitle`, `add_effect`, `save_draft`. Profils `capcut_legacy`, `jianying_legacy`, `jianying_pro_10` |
| [Hommy-master/capcut-mate](https://github.com/Hommy-master/capcut-mate) | 1,5 k ★ / 239 forks | Apache-2.0 | FastAPI, `/openapi/capcut-mate/v1`, plugin Coze officiel, intégration n8n, rendu cloud via `gen_video` |
| [renezander030/capcut-cli](https://github.com/renezander030/capcut-cli) | 249 ★ | MIT | CLI Node 18 zéro-dépendance, « JSON in, JSON out », écriture atomique + backup, `version-aware mask writes` |
| Divers MCP servers | — | — | [jianying-mcp](https://glama.ai/mcp/servers/hey-jian-wei/jianying-mcp/tools/create_draft), [capcut-mcp](https://lobehub.com/mcp/fancyboi999-capcut-mcp) |

**Verdict Q1 :** oui, il existe une surface réelle, **non officielle, rétro-ingénierée, locale et non garantie**. Un projet qui génère un vrai projet CapCut ouvrable a une valeur démo énorme (« ce n'est pas un MP4, c'est un projet »). Un projet qui se contente de dire « compatible CapCut » n'en a aucune.

### 1.3 Les risques de cette surface — à lire avant de s'engager

- **Le draft doit atterrir sur le disque d'une machine où CapCut Desktop est installé.** Démo = alt-tab vers une app native, pas un lien navigateur. Sur un pitch de 3 minutes, c'est un coût réel.
- **Les drafts générés ne sont pas toujours reconnus par l'app** — bug documenté : dossier créé dans `com.lveditor.draft`, CapCut ne le liste pas ([capcut-cli issue #32](https://github.com/renezander030/capcut-cli/issues/32)).
- **Chemins de médias absolus** → un projet généré sur une machine ne s'ouvre pas sur une autre (erreurs « invalid unusual path »).
- **Les CGU CapCut interdisent explicitement le reverse engineering** : « copying, deciphering, modifying, adapting, translating, reverse engineering, disassembling, decompiling, or creating derivative works based on the Services » ([CapCut ToS](https://www.capcut.com/clause/terms-of-service)). Écrire un fichier JSON sur ton propre disque n'est pas « reverse engineer the Services », mais la formulation du pitch compte : dis **« on exporte vers votre format pour que les gens finissent dans CapCut »**, jamais « on a reversé CapCut ».
- **Le renommage `CapCutAPI` → `VectCutAPI`** (même repo, même auteur, badges « CapCutAPI » encore présents) sent la pression juridique. Aucune preuve publique de DMCA trouvée — signal faible, mais signal.
- **Risque réglementaire CapCut en UE** : ByteDance sous délai de conformité sur les transferts de données UE→Chine, avec suspension possible du traitement des données dans les 27 États membres ([videodubber — CapCut ban status 2026](https://videodubber.ai/blogs/capcut-ban-status/)). Bâtir un produit dont la valeur dépend de CapCut en Europe est un pari.

**Test binaire à faire avant d'investir une ligne de code (30 min, vendredi soir) :** prendre un draft « hello world » généré par `capcut-cli` ou `capcut-mate`, le déposer dans le dossier projets de la machine de démo, ouvrir CapCut. Ça s'ouvre ou ça ne s'ouvre pas. Cette expérience à 30 minutes décide de tout le reste.

---

## 2. Où est le vrai trou ? (au-delà du pricing)

Cinq candidats, notés honnêtement.

### 2.1 L'éditabilité de la sortie — **le trou réel, et il est CapCut-shaped** ⭐

Tous les générateurs UGC crachent un MP4 plat. La question que pose un performance marketer et à laquelle aucun outil ne répond : *« puis-je modifier cette scène sans régénérer toute la vidéo ? »*

- **Arcads n'a aucun éditeur timeline** : il faut exporter le MP4 brut vers Filmora/CapCut pour ajuster le rythme ou ajouter de la musique. [Filmora — Arcads review 2026](https://filmora.wondershare.com/video-editor-review/arcads-review.html)
- Creatify a un éditeur intégré, mais « la sortie est robotique » et demande une retouche manuelle. [AdsTurbo comparatif](https://adsturbo.ai/blog/top-ai-ugc-video-generators-review-2026)
- **Côté CapCut, le batch export gère les *formats*, pas les *variantes*** : aucune feature native « 20 versions du même projet avec 20 hooks différents ». [Guide batch export CapCut](https://www.capcut.com/resource/top-batch-editors)

C'est le seul trou de cette liste qui est (a) réel, (b) démontrable en 10 secondes, (c) exactement à l'intersection du sponsor.

### 2.2 La coordination (briefs, révisions, licences, hand-off) — réel mais indémontrable

Le goulot n'est pas la production, c'est *tout ce qui entoure* le rush : « juggling creator outreach, briefs, revisions, licensing, and channel handoffs across spreadsheets and DMs ». Cycle standard : 2 à 3 semaines du concept au test live. Un account manager tient 10-15 créateurs max.
→ [Conbersa — UGC agencies can't scale past 50 creators](https://www.conbersa.ai/blog/ugc-agencies-cant-scale-past-50-creators) · [UGC Roster — revision & approval process](https://www.ugcroster.com/blog/brands/ugc-revision-approval-process-setup)

C'est un SaaS B2B ops. Impossible à construire en 24 h, impossible à démontrer en 3 minutes. **À écarter pour ce format.**

### 2.3 La fatigue créative — valide la *demande de volume*, pas le produit

- Étude Confect : 3 014 annonceurs e-commerce, 834 M$ de dépense, 115,7 Md d'impressions → **durée de vie utile d'une créa passée de 6-8 semaines à 2-4 semaines** post-Andromeda.
- Meta : fréquence > 3,4/semaine → **-45 % de taux de conversion** ; en phase de déclin (jours 15-21) : CPA +20-40 %, CTR -25-35 %.
→ [Darkroom — creative fatigue testing framework](https://www.darkroomagency.com/observatory/creative-fatigue-performance-testing-framework) · [Addict Mobile — ad fatigue 2026](https://addict-mobile.com/en/blog-ad-fatigue-2026-how-to-fix-it/)

Ça confirme que le marché veut 20-40 variantes/mois. Ça ne dit rien sur le fait que *toi* tu doives être celui qui les fabrique.

### 2.4 La défiance consommateur — **argument CONTRE le produit, pas pour**

- **63 %** des consommateurs se disent moins susceptibles d'acheter à une marque qui utilise des pubs générées par IA ; **73 %** feraient moins confiance à une pub soupçonnée d'être IA ; **78 %** trouvent que l'IA rend les pubs « moins authentiques » (Harris Poll, présenté à Cannes Lions).
→ [Marketing Brew — AI fatigue, less trust in AI-generated ads](https://www.marketingbrew.com/stories/harris-poll-ai-fatigue-less-trust-ai-generated-ads-cannes-lions)
- **31 %** rejettent totalement le contenu généré par IA — format le moins fiable du panel.
→ [Rewarx — AI slop & trust backlash 2026](https://www.rewarx.com/blogs/trust-slop-backlash-ecommerce-2026)

Construire une usine à pubs IA dans une salle d'artistes IA, en 2026, avec ces chiffres qui circulent : le jury peut avoir la réaction inverse de celle espérée.

### 2.5 La conformité / provenance — **trou objectivement vacant, mais mortellement ennuyeux**

Fait remarquable et daté : **les obligations de transparence de l'article 50 du règlement européen sur l'IA s'appliquent à partir du 2 août 2026** — le jour même du pitch. Marquage machine-readable des contenus synthétiques (art. 50(2)), divulgation des deepfakes (art. 50(4)). Un « AI Omnibus » propose de repousser le 50(2) au 2 décembre 2026, adoption formelle en attente.
→ [artificialintelligenceact.eu — guide article 50](https://artificialintelligenceact.eu/transparency-rules-article-50/) · [Commission européenne — FAQ art. 50](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act) · [Greenberg Traurig, juin 2026](https://www.gtlaw.com/en/insights/2026/6/deepfakes-chatbots-ai-generated-text-european-commission-details-transparency-obligations-under-the-ai-act)

En parallèle : Meta rend la déclaration IA **obligatoire** sur les pubs Facebook/Instagram en 2026 (case à cocher, rejet de l'annonce sinon) ; TikTok auto-labellise via C2PA depuis janvier 2025 sans pénalité de reach.
→ [Novoads — comparatif règles Meta/TikTok/Google 2026](https://novoads.ai/en/blog/ai-ad-label-rules-2026) · [Billo — platform AI labeling 2026](https://billo.app/blog/ai-labeling/)

Personne n'outille ça pour les créateurs. C'est un vrai vide. **Mais** : « on a fait un outil de conformité » ne fait pas applaudir une salle venue voir du cinéma. Note honnête : 8/10 en pertinence marché, 2/10 en effet démo. À garder en poche comme *phrase* (« Découpage écrit les Content Credentials C2PA dans l'export »), jamais comme produit.

---

## 3. Antériorité — c'est un bain de sang, et il y a des cadavres

| Acteur | Statut | Ce que ça signifie pour toi |
|---|---|---|
| **Arcads** | **Paris**, fondé par Dylan Fournier & Romain Torres. **15 M$ ARR** (2026, vs 10 M$ en 2025), **16 M$ seed mené par Eurazeo** (17 déc. 2025), 6 000+ clients, 100 000+ vidéos/mois, 7-10 personnes. [Latka](https://getlatka.com/companies/arcads.ai) · [PRNewswire](https://www.prnewswire.com/news-releases/arcadsai-raises-16-million-usd-in-seed-funding-to-accelerate-development-in-the-united-states-302644990.html) · [Quasa](https://quasa.io/media/ai-shovels-for-ai-gold-rush-french-startup-arcads-ai-raises-16m-on-api-wrappers-alone) | **Le champion est ta voisine.** Pitcher ça à Paris, c'est pitcher devant des gens qui ont peut-être bu un café avec les fondateurs. |
| **Icon (icon.com)** | **MORT.** Founders Fund + execs OpenAI/Pika/Cognition, 12 M$ pour le domaine, ~5 M$ ARR, pitch = « *like ChatGPT + CapCut, but for making winning ads with AI in minutes* ». Site derrière un mur Vercel en mars 2026, équipe disparue de LinkedIn. [TechStartups](https://techstartups.com/2026/03/05/icon-the-ai-ad-startup-shuts-down-after-spending-12m-on-the-icon-com-domain/) · [CTOL Digital](https://www.ctol.digital/news/icon-com-12m-domain-human-ads-ai-startup-collapse-investors-2026/) · [le tweet de lancement](https://x.com/kennandavison/status/1886836061378372064) | **C'est littéralement le pitch de l'idée D, financé par Peter Thiel, et il est mort il y a 4 mois.** |
| **Creatify** | **15,5 M$ Série A** (WndrCo + Kindred, mai 2025), 9 M$ ARR en 18 mois, Katzenberg au board, 23 M$ levés au total. [Creatify blog](https://creatify.ai/blog/announcing-our-15-5m-series-a-a-new-chapter-for-creatify) · [The SaaS News](https://www.thesaasnews.com/news/creatify-raises-15-5-million-in-series-a) | Éditeur intégré = ils ont déjà bouché le trou 2.1 en partie. |
| **GetHookd** | **19-29 $/mois.** Base de 65 M de pubs Meta, Brand Spy, « upload a winning ad → l'IA génère hooks, angles, scripts en secondes », génération de dizaines de variantes d'images. [GetHookd for agencies](https://www.gethookd.ai/main/for-agencies/) · [review](https://www.hookads.ai/reviews/gethookd-ai) | **« Brief → variantes d'angles et de hooks » — c'est leur produit, il est live, il coûte 19 $.** C'est la mort de la formulation littérale de l'idée D. |
| **HeyGen / MakeUGC / EzUGC / Topview / Poolday / UGCFarm / Atlabs / Viralinn / Koro / Higgsfield Hermes** | Tous live, 29-119 $/mois. Higgsfield Hermes fait de la « 15-second multi-shot consistency », Koro règle le « product-in-hand ». [Shhots comparatif](https://shhots.ai/blog/best-ai-ugc-ad-tools/) · [Playcut top 8](https://playcut.ai/blog/best-ai-ugc-generators-2026/) · [Atlabs comparatif](https://www.atlabs.ai/blog/atlabs-ai-vs.-heygen-vs.-creatify-vs.-arcads-vs.-viralinn-which-ai-ugc-tool-is-actually-worth-paying-for-in-2026) | Le comparatif « 7 meilleurs outils UGC IA » est un genre littéraire à lui seul. |
| **Le sponsor lui-même** | **Pippit** (équipe CapCut/ByteDance, lancé juin 2025, Seedance 1.5 pro depuis déc. 2025) : génération vidéo intelligente, humains digitaux, e-commerce. **CapCut Video Studio** (25 mars 2026) : workspace **sans timeline**, agent qui écrit le script, développe les personnages, construit le storyboard, génère les plans et assemble ; *omni reference* pour la consistance visage/perso/style. Sur Seedance 2.0. Déployé en SEA/MENA/LATAM/Afrique — **Europe « bientôt »**. [Wikipedia Pippit](https://en.wikipedia.org/wiki/Pippit) · [Quasa — CapCut Video Studio](https://quasa.io/media/capcut-just-launched-an-ai-video-studio-that-ditches-timelines-entirely) · [MLQ News](https://mlq.ai/news/capcut-launches-video-studio-with-ai-video-generation/) | **Tu proposerais à CapCut de refaire, moins bien, en 24 h, deux produits qu'ils ont déjà expédiés.** |

**Reste-t-il une place ?** Une seule, étroite : **l'éditabilité de la sortie et le hand-off vers l'éditeur**. Tous les autres se battent sur la qualité de l'avatar et le prix au clip. Personne ne rend le résultat *ouvrable*. C'est mince — et ce n'est pas un produit, c'est une feature.

---

## 4. Faisabilité en 24 h

**Produit minimum crédible (si on partait quand même) :**
brief marque (texte + photo produit) → Claude génère 6 angles × hooks → TTS → clips avatar → **assemblage en projet CapCut, un montage par variante, texte/hook en calque éditable** → l'utilisateur ouvre CapCut et bricole.

**Stack et coûts :**

| Brique | Choix | Coût |
|---|---|---|
| Brief → angles/hooks/scripts | Claude | négligeable |
| Voix | ElevenLabs : 0,10 $/1 000 car. (Multilingual v2/v3), 0,05 $ (Flash/Turbo) ([API pricing](https://elevenlabs.io/pricing/api)) | < 1 $ |
| Vidéo avatar | HeyGen API : **0,05 $/s = 3 $/min** ; plus de crédits API gratuits depuis février 2026 ([Arcade — HeyGen pricing 2026](https://www.arcade.software/post/heygen-pricing)) | 6 clips × 15 s ≈ **4,50 $** |
| Vidéo générative | fal.ai (bloqué depuis ce conteneur, dispo au hackathon) | ~2-10 $ |
| Assemblage CapCut | `capcut-mate` ou `VectCutAPI` (Apache-2.0), ou `capcut-cli` (MIT, Node zéro-dép) | 0 $ |
| Stockage / DB | Supabase (sponsor — points gratuits) | 0 $ |

**Total démo : 10-30 $.** Le coût n'est pas le problème.

**Ce qui est dur, par ordre de létalité :**
1. **Faire ouvrir le draft généré dans la version de CapCut installée sur la machine de démo.** Risque binaire, non contrôlable, dépendant de la version. Le bug « dossier créé mais non listé » est documenté. → Test de 30 min obligatoire *avant* de s'engager.
2. **La résolution des chemins de médias.** Il faut télécharger tous les assets générés dans le dossier du draft et écrire des chemins absolus corrects pour *cette* machine.
3. **La latence.** Génération avatar = dizaines de secondes à minutes par clip. Impossible de générer live pendant les 3 minutes → il faut pré-cuire et mentir un peu, ce que le jury sent.
4. **La démo n'est pas dans le navigateur.** Alt-tab vers une app desktop, attendre son chargement, scroller la liste de projets. Sur un chrono de 180 secondes, chaque seconde de plomberie coûte.

**Verdict faisabilité :** techniquement faisable. Le risque n'est pas « est-ce qu'on y arrive », c'est « est-ce que ça vaut le coup d'y arriver ».

---

## 5. Le moment de démo — réponse honnête

**Ce qui NE marche pas :** la grille de variantes.

Sois lucide. Une grille 3×3 de faux créateurs UGC disant neuf hooks légèrement différents sur un sérum, c'est :
- visuellement **identique à la homepage d'Arcads**, que la moitié de la salle a déjà vue ;
- **esthétiquement mort** — 9 vidéos qui se ressemblent, c'est 9 fois moins impressionnant qu'une belle ;
- **culturellement à contre-emploi** dans un événement organisé par un créateur nommé « Le Motif », dont deux tracks sur trois s'appellent « AI Cinema & Series » et « AI Shorts & Vertical Content ». Une salle venue pour la narration regarde un tableur animé.

Et le pire : la grille de variantes **se juge sur la qualité des clips**, c'est-à-dire sur la qualité du modèle sous-jacent — pas sur la tienne. Tu offres au jury un moyen de juger Seedance, pas ton travail.

**Ce qui marche (les 10 secondes) :**

> Clic sur **Export**. Alt-tab vers CapCut, déjà ouvert. Le projet apparaît dans la liste. Double-clic. **La timeline se remplit** : pistes nommées, segments découpés, calques texte sélectionnables, le hook modifiable au clavier en direct. Une phrase : *« Ce n'est pas un MP4. C'est un projet CapCut. Vous continuez le montage. »*

Ça, ça provoque une réaction — surtout devant un représentant CapCut, parce que **personne dans la salle ne sait que c'est possible**. C'est le seul moment de l'idée D qui n'est pas déjà vu.

Mais sois honnête sur sa nature : **c'est un applaudissement de plomberie, pas d'art.** Un ingénieur dans le jury dit « oh, joli ». Un réalisateur ne ressent rien. Compare avec le moment de démo de Découpage — *tu parles à la caméra, la caméra bouge à l'écran, puis quatre angles du même instant qui raccordent* — qui fait ressentir quelque chose à tout le monde dans la salle, technique ou pas.

**Conclusion Q5 :** l'export CapCut est un *bon deuxième moment*, jamais un premier.

---

## 6. Le rapport bénéfice/risque du sponsor

**Le calcul de base est défavorable.** Le prix principal se juge sur les trois tracks confondus ; le prix CapCut est un prix spécial. Viser le prix spécial, c'est optimiser pour le plus petit lot **dans la catégorie la plus encombrée** : les deux autres tracks sont des tracks de *contenu*, où CapCut est l'outil naturel. Une bonne partie des 50 builders montera des vidéos dans CapCut et le dira. La mention CapCut n'est pas un différenciateur — c'est le bruit de fond.

**Ce qui est contre-intuitif et important :** en 2026, **CapCut n'achète pas de la légitimité publicitaire — ils l'ont déjà** (Pippit, Video Studio, Commerce Pro). Ce qu'ils achètent, c'est de la **légitimité narrative** :
- **CRE[AI]TE 2026**, leur premier festival IA : Grand Prix **70 000 $**, 4 catégories (Film, Series, Creative, Commercial), 20 000 $ par catégorie, **soumissions ouvertes jusqu'au 10 août 2026** — donc ouvertes *pendant* le hackathon.
→ [capcut.creaite26.com](https://capcut.creaite26.com/) · [Guidelines](https://capcut.creaite26.com/guidelines) · [annonce CapCut sur X](https://x.com/capcutapp/status/2065111454794309735)
- **CapCut AI Short Film Contest: Road to Cannes**.
→ [capcut.com/create/capcut-ai-short-film-contest-road-to-cannes](https://www.capcut.com/create/capcut-ai-short-film-contest-road-to-cannes)

**Traduction stratégique : le mouvement optimal pour plaire à CapCut n'est pas de faire un outil de pub, c'est de faire un outil de cinéma qui exporte vers CapCut.** C'est exactement Découpage + un bouton. Tu n'as **rien à sacrifier**.

Phrase à dire au représentant CapCut, si elle est vraie le dimanche :
> « La couverture sort dans un projet CapCut, éditable, prêt à monter. Et c'est avec ça qu'on soumet à CRE[AI]TE. »

**Risques sponsor à connaître :**
- Formulation : « on a reversé votre format » = mauvais. « on exporte vers votre éditeur » = bon. Les CGU interdisent le reverse engineering.
- CapCut a une exposition réglementaire UE réelle (transferts de données) ; ne construis pas ta *thèse* sur CapCut, construis ton *export* sur CapCut.

---

## 7. Le meilleur argument CONTRE l'idée (obligatoire)

Le voici, sans amortisseur :

**Tu proposerais de construire, en 24 heures, une version dégradée d'Arcads — une entreprise parisienne à 15 M$ d'ARR — devant un jury parisien, dans une catégorie où l'entrant américain le mieux financé (Icon, Founders Fund, 12 M$ juste pour son nom de domaine, pitché mot pour mot comme « ChatGPT + CapCut pour faire des pubs ») a fait faillite il y a quatre mois, où un outil à 19 $/mois (GetHookd) fait déjà *exactement* « brief → hooks + angles + variantes » avec une base de 65 millions de pubs en plus, et où le sponsor que tu essaies d'impressionner a déjà expédié deux produits concurrents — dont un lancé en mars 2026 qui fait script, storyboard, génération et assemblage tout seul.**

**Et le produit final que tu montrerais — une grille de pubs IA — s'adresse à un marché dont 63 % des consommateurs disent qu'ils achèteraient moins à une marque qui l'utilise.**

**Le seul morceau original de toute l'idée (l'export vers un draft CapCut) n'est pas un produit : c'est un bouton d'export de trois heures, qui appartient à n'importe quel produit qui le veut — y compris Découpage. Garder l'idée D en entier pour obtenir ce bouton, c'est jeter un outil de cinéma défendable pour acquérir une feature qu'on peut simplement voler.**

Argument secondaire, moins spectaculaire mais peut-être plus décisif : **l'idée D échange un risque que tu maîtrises contre un risque que tu ne maîtrises pas.** Le risque de Découpage est technique et interne (est-ce que le control pass rend à temps ?) — tu peux le débugger. Le risque de l'idée D est externe et binaire (est-ce que ce draft s'ouvre dans *cette* version de CapCut sur *cette* machine ?) — tu ne peux que le tester et prier.

---

## 8. Verdict et recommandation opérationnelle

### Verdict : **à écarter comme produit ; viable uniquement comme feature de Découpage.**

**Ce qu'on jette :** le générateur de variantes UGC, la grille de hooks, le positionnement « outil marketing ». Occupé, mortel, hors-sujet pour la salle, et il existe un cimetière.

**Ce qu'on garde — une chose, exactement :**

> **Découpage exporte un projet CapCut.** La couverture — les N angles du même instant — atterrit sur une timeline CapCut, une piste par caméra, ouvrable, montable.

Pourquoi c'est le bon vol :
- ça donne au sponsor une raison **concrète** de te remarquer, sans changer une ligne du positionnement « Tools for AI Artists » ;
- ça résout le seul trou réel identifié en section 2 (l'éditabilité de la sortie) ;
- ça fait un **deuxième** moment de démo, après le vrai (la caméra qui bouge quand tu parles) ;
- c'est aligné avec ce que CapCut achète vraiment en 2026 (CRE[AI]TE, Cannes), pas avec ce qu'on croit qu'ils achètent ;
- coût : ~3 h, une dépendance Apache-2.0/MIT, zéro dette architecturale.

**Règles d'engagement (à respecter, sinon ça devient un piège) :**
1. **Test de 30 minutes, ce soir** : draft « hello world » via `capcut-cli` ou `capcut-mate` → dossier projets → CapCut s'ouvre ? Si non : abandonner immédiatement, exporter en MP4/FCPXML et ne plus jamais y penser.
2. **Priorité stricte** : on ne touche pas à l'export CapCut tant que la boucle cœur de Découpage (blocking 3D → control pass → N angles qui raccordent) n'est pas démontrable de bout en bout.
3. **Cut-off dur à T-6 h.** Si l'export n'ouvre pas dans CapCut à ce moment-là, on le coupe du pitch sans regret. Ce n'est pas la démo, c'est le bonus.
4. **Vocabulaire du pitch** : « on exporte vers CapCut », jamais « on a reversé CapCut ».
5. **La machine de démo est celle qui a CapCut Desktop installé**, avec les médias déjà locaux. Répéter l'alt-tab au moins deux fois.

**Plan B si le jury/sponsor pousse vers l'UGC** : la seule variante défendable de l'idée D n'est pas la génération, c'est la **conformité** (art. 50 du règlement IA applicable **le jour même du pitch**, obligation de déclaration Meta, C2PA sur TikTok). Marché objectivement vacant. Effet démo : 2/10. À garder comme une phrase dans le pitch (« l'export porte les Content Credentials »), pas comme un projet.

---

## Ce que je n'ai PAS pu vérifier (honnêteté méthodologique)

- **`capcut.com/explore/ai-api` et `pippit.ai/templates/api-introduction`** : 403 au fetch. Mon jugement (« pages SEO, pas de vraie doc dev ») repose sur leur emplacement dans les répertoires de contenu SEO de CapCut et sur l'absence totale de signature développeur (pas de référence d'endpoints, pas de signup clé API, aucun repo ni SDK officiel). **Probable mais non prouvé.**
- **La page Luma du Generathon** : 403. Détails du prix CapCut, composition du jury et critères de notation repris de ton brief, non recoupés.
- **La compatibilité réelle du draft avec la version de CapCut de ta machine de démo** : une seule source communautaire affirme que CapCut International 6.x–9.x reste en JSON clair. **C'est le point le plus important du rapport et c'est le moins bien sourcé.** Le test de 30 minutes n'est pas optionnel.
- **Le renommage CapCutAPI → VectCutAPI** : aucune preuve publique de DMCA ou de mise en demeure trouvée. Inférence, pas fait.

---

## Sources

**Surface technique CapCut**
- [json2video — CapCut API alternative (pas d'API publique)](https://json2video.com/how-to/capcut-api/)
- [samautomation — CapCut API docs? No public API](https://samautomation.work/capcut-api/)
- [Cheat sheet du schéma draft_content.json — versions et chiffrement](https://gist.github.com/renezander030/80823f1d47081c312d2c1f9edd20dc22)
- [sun-guannan/VectCutAPI (ex-CapCutAPI), 2,1 k ★](https://github.com/sun-guannan/VectCutAPI)
- [Hommy-master/capcut-mate, 1,5 k ★](https://github.com/Hommy-master/capcut-mate)
- [renezander030/capcut-cli, 249 ★](https://github.com/renezander030/capcut-cli) · [issue #32 — draft non listé](https://github.com/renezander030/capcut-cli/issues/32)
- [jianying-mcp — create_draft](https://glama.ai/mcp/servers/hey-jian-wei/jianying-mcp/tools/create_draft) · [capcut-mcp sur LobeHub](https://lobehub.com/mcp/fancyboi999-capcut-mcp)
- [emosheeep/capcut-export](https://github.com/emosheeep/capcut-export) · [vogelcodes/capcut-srt-export](https://github.com/vogelcodes/capcut-srt-export)
- [CapCut Terms of Service (clause reverse engineering)](https://www.capcut.com/clause/terms-of-service)
- [CapCut Help — Template jump exception (deep-link mobile uniquement)](https://www.capcut.com/help/template-jump-exception)
- [videodubber — statut réglementaire CapCut / risque UE](https://videodubber.ai/blogs/capcut-ban-status/)

**Produits du sponsor**
- [Quasa — CapCut Video Studio, mars 2026, sans timeline, Seedance 2.0](https://quasa.io/media/capcut-just-launched-an-ai-video-studio-that-ditches-timelines-entirely)
- [MLQ News — CapCut launches Video Studio](https://mlq.ai/news/capcut-launches-video-studio-with-ai-video-generation/)
- [Wikipedia — Pippit (équipe CapCut, ByteDance)](https://en.wikipedia.org/wiki/Pippit)
- [CRE[AI]TE 2026 — festival IA CapCut, 70 k$ Grand Prix](https://capcut.creaite26.com/) · [Guidelines](https://capcut.creaite26.com/guidelines) · [annonce X](https://x.com/capcutapp/status/2065111454794309735)
- [CapCut AI Short Film Contest: Road to Cannes](https://www.capcut.com/create/capcut-ai-short-film-contest-road-to-cannes)

**Concurrence**
- [Latka — Arcads, 15 M$ ARR](https://getlatka.com/companies/arcads.ai) · [PRNewswire — seed 16 M$](https://www.prnewswire.com/news-releases/arcadsai-raises-16-million-usd-in-seed-funding-to-accelerate-development-in-the-united-states-302644990.html) · [Quasa — Arcads, startup française](https://quasa.io/media/ai-shovels-for-ai-gold-rush-french-startup-arcads-ai-raises-16m-on-api-wrappers-alone)
- [TechStartups — Icon ferme après 12 M$ de domaine](https://techstartups.com/2026/03/05/icon-the-ai-ad-startup-shuts-down-after-spending-12m-on-the-icon-com-domain/) · [CTOL Digital — analyse de l'effondrement](https://www.ctol.digital/news/icon-com-12m-domain-human-ads-ai-startup-collapse-investors-2026/) · [tweet de lancement d'Icon](https://x.com/kennandavison/status/1886836061378372064)
- [Creatify — Série A 15,5 M$](https://creatify.ai/blog/announcing-our-15-5m-series-a-a-new-chapter-for-creatify) · [The SaaS News](https://www.thesaasnews.com/news/creatify-raises-15-5-million-in-series-a)
- [GetHookd — hooks/angles/scripts, 65 M pubs, 19-29 $/mois](https://www.gethookd.ai/main/for-agencies/) · [review HookAds](https://www.hookads.ai/reviews/gethookd-ai)
- [Filmora — Arcads review 2026 (pas d'éditeur timeline)](https://filmora.wondershare.com/video-editor-review/arcads-review.html)
- [AdsTurbo — MakeUGC vs Creatify vs Arcads](https://adsturbo.ai/blog/top-ai-ugc-video-generators-review-2026) · [Shhots — Topview/Poolday/MakeUGC/UGCFarm](https://shhots.ai/blog/best-ai-ugc-ad-tools/) · [Playcut — top 8 générateurs UGC 2026](https://playcut.ai/blog/best-ai-ugc-generators-2026/) · [Atlabs — comparatif 5 outils](https://www.atlabs.ai/blog/atlabs-ai-vs.-heygen-vs.-creatify-vs.-arcads-vs.-viralinn-which-ai-ugc-tool-is-actually-worth-paying-for-in-2026)

**Marché, workflow, confiance**
- [Conbersa — les agences UGC ne passent pas 50 créateurs](https://www.conbersa.ai/blog/ugc-agencies-cant-scale-past-50-creators) · [UGC Roster — process de révision](https://www.ugcroster.com/blog/brands/ugc-revision-approval-process-setup)
- [Darkroom — framework de fatigue créative (étude Confect)](https://www.darkroomagency.com/observatory/creative-fatigue-performance-testing-framework) · [Addict Mobile — ad fatigue 2026](https://addict-mobile.com/en/blog-ad-fatigue-2026-how-to-fix-it/)
- [Marketing Brew — Harris Poll : 63 % achèteraient moins](https://www.marketingbrew.com/stories/harris-poll-ai-fatigue-less-trust-ai-generated-ads-cannes-lions) · [Rewarx — AI slop & trust backlash](https://www.rewarx.com/blogs/trust-slop-backlash-ecommerce-2026)
- [CapCut — batch export = formats, pas variantes](https://www.capcut.com/resource/top-batch-editors)

**Réglementaire**
- [artificialintelligenceact.eu — article 50 en pratique](https://artificialintelligenceact.eu/transparency-rules-article-50/) · [texte de l'article 50](https://artificialintelligenceact.eu/article/50/)
- [Commission européenne — FAQ obligations de transparence](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)
- [Greenberg Traurig — détail des obligations, juin 2026](https://www.gtlaw.com/en/insights/2026/6/deepfakes-chatbots-ai-generated-text-european-commission-details-transparency-obligations-under-the-ai-act) · [Jones Day — code de bonnes pratiques sur le labelling](https://www.jonesday.com/en/insights/2026/01/european-commission-publishes-draft-code-of-practice-on-ai-labelling-and-transparency)
- [Novoads — règles de label IA Meta/TikTok/Google 2026](https://novoads.ai/en/blog/ai-ad-label-rules-2026) · [Billo — C2PA et labelling plateformes](https://billo.app/blog/ai-labeling/)

**Coûts**
- [HeyGen pricing 2026 — 0,05 $/s, plus de crédits API gratuits](https://www.arcade.software/post/heygen-pricing) · [ElevenLabs API pricing](https://elevenlabs.io/pricing/api)

**Événement**
- [Generathon — Luma](https://luma.com/wobryy3j) · [An Open Room — 1er août](https://www.anopenroom.com/paris/fr/events/generathon-24h-pour-construire-le-futur-du-contenu-0801) · [Demo Night — 2 août](https://www.anopenroom.com/paris/fr/events/generathon-demo-night-0802-mrnoyq1a)
