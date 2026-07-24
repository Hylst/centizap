# Centizap — Structure du projet

```
build-centipede-game-game-development/
├── index.html              # Point d'entrée Vite
├── package.json            # Dépendances et scripts
├── vite.config.ts          # Configuration Vite (base: /centizap/)
├── tsconfig.json           # Configuration TypeScript
├── src/
│   ├── main.tsx            # Point d'entrée React
│   ├── App.tsx             # Composant principal (~2156 lignes)
│   ├── index.css           # Styles globaux (Tailwind)
│   └── utils/
│       └── cn.ts           # Utilitaire cn() (clsx + tailwind-merge)
├── about.md                # À propos du jeu
├── features.md             # Fonctionnalités détaillées
├── structure.md            # Ce fichier
├── todo.md                 # Tâches et améliorations futures
├── changelog.md            # Journal des modifications
└── .gitignore              # Fichiers ignorés par git
```

## Architecture

Le jeu est un composant React unique (`App.tsx`) qui gère :
- La boucle de rendu Canvas 2D (requestAnimationFrame)
- Le moteur de jeu (updateGame, renderGame)
- Le système audio procédural (Web Audio API)
- Les entrées clavier et tactiles
- L'interface HUD React

### Moteur de jeu

- **Grille** : 24 colonnes × 34 lignes, cellules de 24px (576×816px)
- **Zone joueur** : 8 dernières lignes
- **Entités** : Player, Bullets, Centipedes, Spiders, Mushrooms, PowerUps, Particles, FloatingTexts
- **5 thèmes de niveau** : Néon, Forêt Toxique, Désert Aride, Abysses Glacés, Cœur Stellaire
- **Audio** : 10 effets sonores + musique procédurale par niveau
