# La grammaire de direction

> Comment on passe de *« serre sur le détective, contre-plongée, dolly avant lent »*
> à une caméra 3D exacte **et** à un prompt que le modèle comprend.

---

## Le principe : trois étages, et le LLM n'en fait qu'un

```
  intention FR ──①LLM──▶ ShotSpec ──②solveur──▶ CameraState ──③compilateur──▶ prompt
   « serre sur          vocabulaire          position, cible,        texte modèle-
     le détective »     de cinéma            focale, trajectoire      spécifique
```

**Le LLM ne sort jamais de coordonnées.** C'est la décision d'architecture qui porte tout le
projet. Un LLM à qui on demande « place la caméra à 2,5 m en contre-plongée » sort des nombres
plausibles et faux, et le plan devient une loterie — exactement le problème qu'on prétend résoudre.

À la place, le LLM ne fait qu'une chose, qu'il fait très bien : **traduire du français de
réalisateur en vocabulaire de cinéma structuré**. La géométrie est ensuite résolue de façon
déterministe par du code. Conséquences directes :

- **Reproductible.** Même intention → même caméra, à la virgule près. On peut re-tourner un plan.
- **Les 180° sont garantis par construction**, pas espérés.
- **Ça se débogue.** Quand un plan est faux, on sait si c'est la traduction ou la géométrie.

Implémentation de référence de l'étage ② : [`derisk/shot_solver.mjs`](../../derisk/shot_solver.mjs)
(auto-test inclus : `node shot_solver.mjs`).

---

## ① Intention → ShotSpec

### Le schéma

```jsonc
{
  "subject":   "A" | "B" | ["A","B"],   // qui est cadré ; un tableau = plan d'ensemble
  "shotSize":  "ECU|CU|MCU|MS|MLS|FS|LS|ELS",
  "angle":     "low|eye|high|overhead",
  "lens_mm":   18 | 24 | 35 | 50 | 85 | 135,
  "framing":   "single|ots|profile|master",   // optionnel, déduit du subject
  "move":      { "type": "static|push|pull|dolly|crane|orbit", "speed": "slow|medium|fast" },
  "duration_s": 3,
  "intent":    "il domine, il sait qu'il a gagné"   // l'émotion, pour l'étage ③
}
```

`intent` est le seul champ en prose libre. Il ne sert pas à la géométrie — il sert à écrire le
prompt à l'étage ③, où décrire le jeu et l'atmosphère a du sens.

### Le prompt système (à copier tel quel demain)

```
Tu traduis les intentions d'un réalisateur en spécifications de plan structurées.

Tu ne produis JAMAIS de coordonnées, de positions ni de distances. La géométrie est
résolue en aval par un solveur. Tu produis uniquement du vocabulaire de cinéma.

Sors un unique objet JSON conforme au schéma ShotSpec. Rien d'autre.

Règles de traduction :
- « serré », « proche », « son visage »        → MCU ou CU
- « très gros plan », « ses yeux »             → ECU
- « on voit la pièce », « situe la scène »     → LS, subject = les deux acteurs
- « plan américain », « trois-quarts »         → MLS
- « contre-plongée », « il domine »            → angle: low
- « plongée », « il est écrasé »               → angle: high
- « au ras du sol »                            → angle: low + lens 24
- longue focale, compression, isoler           → 85 ou 135
- large, immersif, on sent l'espace            → 24 ou 35
- « avance », « on se rapproche »              → move.type: push
- « recule », « on découvre »                  → move.type: pull
- « on suit », « travelling latéral »          → move.type: dolly
- « la caméra tourne autour »                  → move.type: orbit
- « on s'élève », « grue »                     → move.type: crane

Par défaut : angle eye, lens 50, move static, duration_s 3.
Si l'intention est ambiguë sur la focale, choisis-la à partir de la taille de plan :
gros plans → 85, plans moyens → 50, plans larges → 35.

Ne commente pas. Ne justifie pas. Sors le JSON.
```

Quelques exemples testés :

| Intention | ShotSpec |
|---|---|
| *« un master large, on voit les deux »* | `{subject:["A","B"], shotSize:"LS", angle:"eye", lens_mm:35, move:{type:"push",speed:"slow"}}` |
| *« serre sur le détective, plan poitrine »* | `{subject:"A", shotSize:"MCU", angle:"eye", lens_mm:85, move:{type:"push",speed:"slow"}}` |
| *« le contrechamp sur le suspect »* | `{subject:"B", shotSize:"MCU", angle:"eye", lens_mm:85, move:{type:"push",speed:"slow"}}` |
| *« gros plan, contre-plongée, il domine »* | `{subject:"A", shotSize:"CU", angle:"low", lens_mm:85, move:{type:"static"}}` |

---

## ② ShotSpec → CameraState (le solveur)

### Une taille de plan est une hauteur de cadre

C'est toute l'astuce. Une taille de plan ne se définit pas par une distance — elle se définit par
**la hauteur de sujet qui tient dans le cadre**, en mètres :

| | ECU | CU | MCU | MS | MLS | FS | LS | ELS |
|---|---|---|---|---|---|---|---|---|
| **hauteur cadrée (m)** | 0,25 | 0,45 | 0,70 | 1,05 | 1,45 | 1,95 | 3,20 | 6,50 |
| | les yeux | tête + épaules | poitrine | taille | mi-cuisses | pied | large | ensemble |

### La formule

Avec un capteur full-frame (24 mm de haut), `tan(vFOV/2) = 12/f`, donc :

> **distance = hauteur cadrée × focale ÷ 24**

Une taille de plan et une focale **déterminent** la distance. Il n'y a rien à régler à la main.

Vérifications de plateau : un CU au 85 mm → 1,59 m. Un plan moyen au 50 → 2,19 m. Un large au
35 → 4,67 m. Ce sont des distances de tournage crédibles — c'est bon signe.

### Le placement

1. **La ligne d'action** est l'axe entre les deux acteurs. Sa normale horizontale, orientée du côté
   choisi une fois pour toutes pour la scène, définit le demi-espace autorisé.
2. **L'azimut** est l'angle entre l'axe de regard du sujet et la caméra :
   over-the-shoulder 22°, single classique 38°, profil et master 90°.
3. **La caméra** est à `sujet + distance × dir`, où `dir` combine l'axe de regard et la normale
   selon l'azimut. Comme la composante sur la normale garde toujours le même signe,
   **toutes les caméras de la scène restent du même côté de la ligne**.
4. **La hauteur** est une fraction de la hauteur des yeux du sujet : contre-plongée 0,52,
   hauteur d'œil 1,0, plongée 1,28, plafond 2,4.
5. **La cible** est aux yeux sur un gros plan, et descend vers le centre du corps à mesure que le
   plan s'élargit.
6. **Un master** se cadre sur le milieu du groupe, et sa distance est contrainte par la *largeur*
   à couvrir, pas par la hauteur — le solveur élargit si les deux acteurs ne tiennent pas en 16:9.

### L'invariant

```js
checkCoverage(shots, scene)   // → { ok: true, sides: [1,1,1,1] }
```

Toutes les caméras d'une scène doivent renvoyer le même signe. C'est un test unitaire, pas une
alerte cosmétique : si une caméra franchit la ligne, les plans ne raccorderont pas, et on le sait
**avant** d'avoir dépensé un centime de génération.

### Limite connue

Le solveur ne fait pas de détection de collision — il peut poser une caméra dans une table ou dans
un mur. Cas rare aux focales longues, réel aux courtes. Correctif si le temps le permet : pousser la
caméra le long de `dir` jusqu'à sortir des volumes du décor.

---

## ③ CameraState → prompt

Le prompt **décrit ce que la géométrie fait déjà**, il ne le commande pas. Le modèle reçoit la
contrainte deux fois — géométriquement par le control pass, textuellement par le prompt — et les
deux disent la même chose. C'est ce qui fait tenir l'adhérence.

Trois blocs, dans cet ordre, identiques pour tous les plans de la scène sauf le premier :

1. **Le plan** — dérivé du ShotSpec : taille, focale, mouvement, sujet.
2. **La scène** — décor, personnages, action. Verrouillé au niveau scène.
3. **Le look** — lumière, pellicule, palette, optique. Verrouillé au niveau scène.

Seul le bloc ① change d'un angle à l'autre. C'est la couverture.

### Le vocabulaire par modèle : à ne PAS écrire soi-même

La syntaxe exacte attendue par chaque modèle (Seedance veut
`Camera: [move] + [speed] + [subject lock]`, Kling et Veo autre chose) est déjà documentée et
testée en open source. Voir l'audit dans [`RESOURCES.md`](RESOURCES.md) — en particulier
[`smixs/visual-skills`](https://github.com/smixs/visual-skills) (CC BY 4.0), qui couvre Seedance 2.5,
Kling 3.0, Veo 3.1 et Nano Banana 2, et qui interdit explicitement le vocabulaire décoratif
(« cinematic », « epic », « stunning ») — un piège classique qui dilue l'adhérence.

**On vendorise ce vocabulaire, on écrit le solveur.** Le premier existe et est meilleur que ce
qu'on écrirait en une nuit ; le second n'existe nulle part.
