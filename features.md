# Centizap — Fonctionnalités

## Gameplay

- **Mille-pattes segmenté** : se divise en 2 à chaque tir réussi, segments de plus en plus rapides
- **Champignons** : obstacles destructibles (4 HP) qui redessinent le terrain
- **Araignées** : ennemis mobiles qui détruisent les champignons et traquent le joueur
- **Vagues progressives** : vitesse, nombre de segments et araignées augmentent
- **Combo** : enchaînement de tirs, multiplicateur de score
- **3 vies** : avec bouclier optionnel absorbant 1 coup

## Power-ups

| Type       | Effet                                | Durée |
|------------|--------------------------------------|-------|
| Éventail   | 3 projectiles en cône                | 8s    |
| Rapide     | Cadence de tir doublée               | 8s    |
| Bouclier   | Absorbe une collision                | 12s   |

## 5 Thèmes visuels

| Niveau | Nom             | Ambiance                       |
|--------|-----------------|--------------------------------|
| 1      | Néon            | Cyan sur fond nuit             |
| 2      | Forêt Toxique   | Vert phosphorescent            |
| 3      | Désert Aride    | Orange/jaune sable             |
| 4      | Abysses Glacés  | Bleu polaire                   |
| 5      | Cœur Stellaire  | Violet/fuchsia cosmique        |

Changement de niveau tous les 3 vagues.

## Audio procédural

- **Musique** : mélodie générée par niveau (patterns de notes, BPM variable)
- **10 SFX** : tir, hit, mushroom, explosion, spider, levelUp, waveClear, gameOver, powerup
- **Sons synthétisés** en temps réel via Web Audio API (pas de fichiers audio)

## Interface

- **Canvas 2D** pour le rendu du jeu (576×816 px)
- **HUD React** : score, vies, vague, niveau, combo
- **Commandes tactiles** pour mobile/tablette
- **Plein écran** (F)
- **Mode muet** (M)
- **Pause** (P)
- **Sauvegarde du meilleur score** en localStorage
