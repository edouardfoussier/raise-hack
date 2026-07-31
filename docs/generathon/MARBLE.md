# Marble : de concurrent à fournisseur

> **Marble construit le décor. Nous dirigeons la scène.**

Marble (World Labs) était identifié ce matin comme notre concurrent le plus proche. Après
vérification, c'est l'inverse : c'est la meilleure brique qu'on puisse brancher sur Découpage.

---

## Ce qui est disponible

| Brique | État | Détail |
|---|---|---|
| **World API** | ✅ public depuis le 21 janvier 2026 | Génère des mondes explorables depuis texte, images, panoramas, multi-vues, **vidéo**. Modèle à crédits : 1 $ = 1 250 crédits ([annonce](https://www.worldlabs.ai/blog/announcing-the-world-api)) |
| **Export splat** | ✅ | .PLY / .SPZ — la représentation haute fidélité |
| **Export collider mesh** | ✅ | Maillage basse fidélité prévu pour la physique ([docs](https://docs.worldlabs.ai/marble/export/mesh)) |
| **Spark** | ✅ **MIT**, `npm i @sparkjsdev/spark` v2.1.0 | Le renderer 3DGS de World Labs **pour Three.js**. 98 %+ de support WebGL2, et surtout : **il fusionne splats et objets mesh dans la même scène** ([repo](https://github.com/sparkjsdev/spark) · [site](https://sparkjs.dev/)) |

**Licence commerciale** : les tiers Free et Standard ne l'incluent pas. Le plan **Pro à 35 $/mois**
est le minimum pour diffuser dans un jeu ou un film. Négligeable, mais à prendre avant le pitch si on
montre le résultat publiquement.

---

## Pourquoi ça s'emboîte exactement

Marble fait des **lieux**. Il ne fait pas de **personnages qui jouent** — un splat est de la géométrie
statique. C'est précisément le partage du travail :

```
   Marble  ─┬─► splat .ply ──────────► passe beauty      (Spark, dans notre scène R3F)
            └─► collider mesh ───┐
                                 ├──► passe depth         (notre shader, inchangé)
   nos mannequins greybox ───────┘
   nos caméras (le solveur) ─────────► la couverture
```

Trois conséquences, par ordre d'importance.

**1. Ça attaque le pain point n°2 — la dérive.** Plus la part du cadre qui est verrouillée est
grande, moins le modèle peut dériver. Aujourd'hui on lui demande d'inventer le décor *et* les
acteurs, sur chaque angle. Avec un décor Marble, il n'a plus qu'à inventer les humains. Le décor est
identique d'un angle à l'autre **par construction**, pas par chance.

**2. Le réalisateur voit son vrai décor pendant qu'il blocke**, au lieu d'une boîte grise. Le plan
de plateau devient lisible, et le choix des axes devient un choix de mise en scène.

**3. Ça neutralise notre concurrent le plus dangereux en l'absorbant.** À la question de jury
« Marble ne fait pas déjà ça ? », la réponse cesse d'être défensive : *« Marble fait le décor —
on l'utilise. Un décor n'est pas une scène : il n'y a personne dedans qui joue. »*

---

## Ce que ça ne change pas

**La colonne vertébrale reste le greybox.** Le pipeline vérifié — geometry → passe depth → control
video → couverture — ne bouge pas d'une ligne. Marble remplace **la couche décor**, pas le pipeline.

Séquencement non négociable : Marble ne se branche qu'**après** que la boucle multi-caméras tourne de
bout en bout. Si la boucle n'est pas finie à 20 h samedi, Marble saute. C'est un multiplicateur, pas
une fondation, et un multiplicateur par zéro fait toujours zéro.

---

## À vérifier avant de s'engager (~15 min)

- [ ] **Accès API** — quel tier, combien de crédits, et le Pro à 35 $ si on diffuse publiquement
- [ ] **Latence de génération d'un monde** — si c'est en minutes, on pré-génère 2-3 décors et on ne
      met jamais Marble dans le chemin critique de la démo live
- [ ] **Format du collider mesh** — glb/obj chargeable directement dans R3F ?
- [ ] **Perf de capture** — rendre 48 frames × 3 caméras sur une scène splat, ça tient ? Le harnais
      actuel fait ça sur du mesh pur en ~2 min ; les splats sont plus lourds
- [ ] **La passe depth sur collider mesh** — la basse fidélité suffit-elle à porter la géométrie ?
      À tester avec le smoke test fal existant, en remplaçant juste la source du depth

## Le risque, nommé

Ajouter une dépendance externe la veille d'un hackathon est exactement le geste qui fait rater les
projets. Ce qui rend celui-ci acceptable : il est **additif et isolable** — une couche de rendu
supplémentaire derrière un flag, sur un pipeline qui marche déjà sans elle. Le jour où Marble tombe
en panne pendant la démo, on repasse en greybox et il ne manque que la beauté.
