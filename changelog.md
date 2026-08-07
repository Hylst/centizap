# Centizap : Changelog

## v1.1.0 (2026-08-03)

### Ajoute
- Bouton Infos dans la barre de controles, ouvrant une modale avec la stack, les
  graphismes, la musique, les interactions et les algorithmes notables (division du
  mille-pattes en deux groupes independants au contact). Etape 15 du chantier de retrofit
  decrit dans `todo.md` racine du monorepo.

### Corrige
- 14 tirets longs (messages de statut en jeu, libelles d'interface, titre de ce changelog)
  remplaces par des deux-points ou des virgules, en conformite avec la regle du depot.

### Verifie
- Build propre, modale testee a l'ouverture/fermeture, aucune erreur console, aucun 404
  (favicon hashe recopie avec le nouveau `index.html`), aucun debordement horizontal en
  390x844.

## v1.0.0 (2026-07-24)

- Version initiale
- Gameplay complet : mille-pattes, champignons, araignées
- 5 thèmes visuels (Néon, Forêt Toxique, Désert Aride, Abysses Glacés, Cœur Stellaire)
- 3 power-ups (éventail, tir rapide, bouclier)
- Système de combo et score
- Audio procédural (musique + 10 SFX)
- Contrôles clavier et tactiles
- Plein écran, pause, mode muet
- Sauvegarde du meilleur score (localStorage)
- Interface React + Canvas 2D
- Intégration plateforme Hylst.Games (URL: /centizap/)

## Créateur

Geoffroy Streit (alias Hylst) — Création assistée par IA.
