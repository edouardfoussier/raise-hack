# Ce que le jury récompense — analyse du pitch gagnant (fal × Sequoia)

Source : transcription du pitch gagnant du hackathon fal × Sequoia, même thème.
**FormBar**, par Dominic (Chapter 41, Berlin).

---

## Ce qu'ils ont construit

1. On upload **une photo**
2. Le système estime **les positions du corps** (pose), **segmente les objets** (SAM3), génère une
   **depth map**
3. → on entre dans un **éditeur 3D** contenant la version 3D de la photo
4. On **supprime des éléments**, on **déplace les objets** (un banc), on **déplace les personnes**,
   on pose des **keyframes séparées par personnage** (« lui bouge d'abord, puis elle »)
5. On ajoute un **mouvement de caméra** (Dolly In) avec ses propres keyframes
6. On enregistre le tout comme un **clip d'animation « clay »** (greybox)
7. → génération vidéo conditionnée par le clay
8. Comparaison côte à côte : la vidéo générée suit le clay de très près

Leur phrase de pitch :

> *« On sait déjà très bien contrôler les premières frames, mais pour la génération vidéo on
> retombait sur du prompt texte. Les animations clay offrent un excellent niveau de contrôle — mais
> elles n'étaient pas accessibles aux non-artistes 3D. C'est ce qu'on change. »*

## La nouvelle inconfortable

**C'est notre thèse, et elle a gagné.** Contrôle 3D/clay → génération vidéo, rendu accessible aux
non-3D. Il faut le savoir avant de monter sur scène, pas pendant les questions.

Deux différences réelles subsistent :

| | FormBar | Découpage |
|---|---|---|
| **Point de départ** | une photo existante → 3D reconstruite | rien → scène écrite |
| **Sortie** | **un plan**, corrigé | **une couverture** — N angles qui raccordent |
| **Contrôle caméra** | manipulation directe dans l'éditeur | langage de réalisateur → solveur déterministe |

Et surtout : **le juré le plus expérimenté a explicitement demandé la suite, et la suite c'est nous.**

---

## Les cinq signaux exploitables

### 1. La démo honnête bat la démo léchée — deux jurés le disent spontanément

> *« I really like the demo, very honest, just straight in the editor, not cherry picked. »* — Kyle
> *« How honest it was — no pretending, just explaining technically what was built, how it was
> built, and why it might be useful. »* — un autre juré

Dans la transcription, on l'entend dire *« Oh. »* quand un truc ne marche pas, et *« I'm not
perfectly happy with that »* avant de recommencer. **Ils l'ont récompensé pour ça.**

→ **Doctrine de démo : live, dans l'éditeur, sans filet.** Pas de vidéo pré-cuite en guise de démo
(la vidéo reste le backup si le wifi meurt). Assumer un ajustement à l'écran plutôt que le masquer.

### 2. Le test qui décide vraiment

> *« One of the hallmarks of a great demo is that you immediately start thinking of things that you
> would want to do with the product. »*

→ Montrer **le geste**, pas seulement le résultat. Le jury doit projeter son propre usage. Un plan
généré est un résultat ; poser une deuxième caméra est un geste.

### 3. Élargir au-delà du réalisateur de cinéma

Un juré étend spontanément le marché : romans visuels, storytelling immersif, *« même si vous n'avez
pas une équipe caméra et du matériel haut de gamme »*.

→ Une phrase dans le pitch suffit. Le track s'appelle « Tools for AI Artists », pas « Tools for Film
Directors » — ne pas se rétrécir soi-même.

### 4. 🎁 Le cadeau de James (ex-previz DreamWorks)

Sa question, posée au gagnant, décrit une feature que FormBar n'avait pas :

> *« Les courbes qui se chevauchent, pour le timing : quand est-ce que tu pousses la caméra par
> rapport à quand tu pousses les personnages ? Ce sont ces subtilités de timing qui font la magie
> poétique d'une séquence. »*

**C'est exactement notre positionnement « personne ne résout le temps », formulé par un juré.**
Et c'est peu coûteux chez nous : le solveur interpole déjà la caméra sur `t` — il suffit d'un
**décalage de timing par acteur** (`delay_s`, `duration_s`) pour que le mouvement d'acteur et le
mouvement de caméra puissent se chevaucher au lieu d'être synchrones.

→ **À implémenter, et à nommer dans le pitch.** Une phrase du type *« l'acteur part, la caméra le
rattrape une demi-seconde plus tard »* signale au jury qu'on pense en réalisateur, pas en dev.

### 5. Le pipeline 3D → gen-media est la frontière reconnue

> *« Cette idée de pipeline 2D/3D vers la gen media, c'est un moment très excitant en ce moment.
> Que tu aies des hooks python dans Blender ou autre chose. J'étais ravi de voir un projet
> s'attaquer à ce moment-là. »* — James

→ Validation directe de l'axe. Ce n'est pas nous qui devons convaincre que le problème existe : un
juré professionnel le pose lui-même. On peut donc consacrer moins de temps au « pourquoi » et plus au
« regardez ».

---

## Ce que ça change dans notre plan

1. **Ajouter le décalage de timing acteur/caméra** — petit, et directement demandé par un juré du
   milieu. Passe devant le reste du polish.
2. **Démo live dans l'éditeur, non cherry-pickée.** La vidéo enregistrée devient un backup, pas la
   démo.
3. **Garder « la couverture » comme différence n°1** — c'est littéralement l'étape d'après FormBar.
   *« FormBar vous corrige un plan. Nous vous donnons une scène. »*
4. **Une phrase pour élargir** au-delà du cinéma (storytelling visuel sans équipe).
