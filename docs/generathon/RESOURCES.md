# Ressources analysées — verdicts

Journal des ressources partagées et de ce qu'on en fait. 🟢 on s'en sert · 🟡 plus tard · 🔴 on écarte.

---

## 🟢 L'écosystème open source de prompts vidéo — **on vendorise**

La grammaire de prompt par modèle existe déjà, sous licence permissive, et elle est mieux
éprouvée que ce qu'on écrirait en une nuit.

| Repo | Ce que c'est | Licence |
|---|---|---|
| [**smixs/visual-skills**](https://github.com/smixs/visual-skills) | **Le meilleur.** Skills Claude « film director » : dramaturgie (priorités de coupe de Walter Murch, blocking, montage) + **syntaxe exacte** pour Seedance 2.5, Kling 3.0 Turbo/Omni, Veo 3.1, Nano Banana 2. Interdit explicitement le vocabulaire décoratif (« cinematic », « epic », « stunning »). | **CC BY 4.0** — usage commercial OK, attribution obligatoire (Serge Shima + lien) |
| [geekjourneyx/awesome-ai-video-prompts](https://github.com/geekjourneyx/awesome-ai-video-prompts) | Guides officiels + templates + taxonomies de plans et de mouvements, pour Veo, Sora, Runway, Pika, Kling | MIT |
| [ilkerzg/awesome-video-prompts](https://github.com/ilkerzg/awesome-video-prompts) | JSON Prompt Builder — écriture de prompts structurés | — |
| [jnMetaCode/ai-shortfilm-prompts](https://github.com/jnMetaCode/ai-shortfilm-prompts) | Skill Claude, 21 templates de genre, structure en 5 étapes, multi-modèles | — |
| [Emily2040/seedance-2.0](https://github.com/Emily2040/seedance-2.0) | Pipeline Seedance : shot labels, budget temps par plan, **cut grammar** | — |

**Ce qu'aucun d'eux ne fait** : passer d'une **scène 3D** à des paramètres de caméra. Ils vont tous
de l'intention au texte. Découpage va de l'intention à la **géométrie**, puis dérive le texte de
cette géométrie. C'est le solveur, et il n'existe nulle part — voir [`GRAMMAR.md`](GRAMMAR.md).

> **Décision : on vendorise le vocabulaire, on écrit le solveur.** Économie estimée : 3-4 h,
> sur le bloc S4 du planning.
> Penser à créditer smixs/visual-skills (CC BY exige l'attribution) — dans le README et sur une
> slide du pitch. Ça joue plutôt en notre faveur devant un jury : on sait ce qui existe.

---

## 🟡 NVIDIA MotionBricks — la bonne slide de roadmap, pas du code pour demain

Un seul réseau entraîné sur **350 000 clips de motion capture** (~700 h, 9 300 skills, 163
performers). On lui dit *« va là, ramasse cette épée, en mode zombie »* et il génère le placement
des pieds, l'équilibre, les transitions et le follow-through — **15 000 fps, 2 ms de latence**.
C'est désormais le moteur de mouvement de la stack **GR00T** de NVIDIA.
([GIGAZINE](https://gigazine.net/gsc_news/en/20260615-nvidia-motionbricks/) ·
[AlphaSignal](https://alphasignal.ai/news/nvidia-s-motionbricks-replaces-decades-of-game-animation-pipelines-at-15-000-fps))

**Pourquoi c'est troublant de pertinence** : notre faiblesse assumée, c'est que les acteurs du
greybox sont statiques. MotionBricks, c'est littéralement « texte → blocking d'acteur animé ».

**Pourquoi on ne le prend pas** : release complète annoncée « autour de juillet 2026 », intégrée à
GR00T Whole-Body Control. Donc soit ça vient de sortir, soit pas encore — dans les deux cas c'est
une release recherche, GPU-lourde, sans chemin navigateur. En 24 h, non.

**Ce qu'on en fait** : une phrase de pitch, et elle est bonne — *« notre couche de contrôle est
agnostique du modèle. Aujourd'hui vous bougez les acteurs à la main. Quand MotionBricks sortira,
vous les dirigerez à la voix. »* Ça montre qu'on a pensé l'après.

---

## 🟡 GNM Head (Google) + Character DNA MetaHuman — roadmap « vrais acteurs »

Google a open-sourcé **GNM Head**, son modèle paramétrique de tête humaine : **250+ contrôles
d'identité, 380+ d'expression**, avec un [importeur Blender gratuit](https://nathandickson365.gumroad.com/l/GNMImporter)
sur une tête entièrement riggée.
([CG Channel](https://www.cgchannel.com/2026/07/google-open-sources-gnm-head-its-parametric-human-head-model/) ·
[80.lv](https://80.lv/articles/google-open-sources-gnm-head-3d-parametric-human-head-model))

En parallèle, Poly Hammer a rendu **Character DNA gratuit** (édition de base) après qu'Epic a publié
OpenRigLogic sous MIT — import/export de MetaHuman dans Blender.
([CG Channel](https://www.cgchannel.com/2026/07/the-character-dna-metahuman-add-on-for-blender-is-now-free/))

**Pourquoi c'est pertinent** : PrevizWhiz nomme explicitement *« des assets riggés de qualité »*
comme l'une des deux barrières de la previz 3D. Ces deux sorties font tomber cette barrière, ce
mois-ci.

**Pourquoi pas demain** : importer un rig MetaHuman dans une app navigateur en 24 h est un
trou noir. Le greybox reste le bon choix — c'est même un argument : *le contrôle ne demande pas de
beaux assets, il demande de la géométrie juste*.

**Ce qu'on en fait** : roadmap. « Aujourd'hui des mannequins gris, demain vos acteurs. »

---

## 🟢 Higgsfield : 14 jours de Seedance illimité — pour **le film de démo**

Higgsfield offre 14 jours de Seedance illimité, et annonce Seedance 2.5.

**Utile, mais pas là où on croit.** C'est une UI, pas une API : ça ne sert pas le produit, ça sert
**le film de démo du dimanche matin** (bloc S6), où il faut générer beaucoup et jeter beaucoup.
Économie réelle de crédits fal sur le poste qui en consomme le plus.

Il existe des skills open source qui pilotent l'UI Higgsfield en Playwright
([liamrjohnston30](https://github.com/liamrjohnston30/claude-seedance-skill),
[AKCodez](https://github.com/AKCodez/higgsfield-claude-skills)) — **à éviter** : automatiser l'UI
d'un service tiers en illimité, c'est chercher les ennuis côté CGU, et pour un projet qu'on pitche
devant un jury où Higgsfield est un acteur du secteur, ça ne vaut pas le risque. On génère à la main.

Signal secondaire : Seedance est bien le modèle du moment. Le confirme comme cible n°1 du
compilateur de prompt.

---

## 🔴 « Une IA open source qui se souvient des objets après leur disparition » (via syntaix.ai)

Permanence d'objet / segmentation-tracking avec mémoire, façon SAM 2.

**On écarte, et pour une bonne raison** : c'est un outil de *perception* — retrouver la structure
d'une scène qu'on ne connaît pas. Nous, on **construit** la scène : on a la vérité terrain de la
géométrie, des identités et des occlusions, gratuitement. Payer un modèle pour redécouvrir ce qu'on
vient d'écrire serait exactement à l'envers.

Seul usage imaginable : un vérificateur de continuité sur des rushes *externes*. Hors scope.
