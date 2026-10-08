# Conventions

## Git

- Un seul dépôt Git, à la racine. Jamais de `git init` dans `backend/` ou `frontend/`.
- Messages de commit au format Conventional Commits :
  `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`
- Un commit par unité logique de travail.

## Backend (Java)

- Package racine : `com.businessmanagementplateform.backend`
- Classes : `PascalCase`. Méthodes et variables : `camelCase`. Constantes : `UPPER_SNAKE_CASE`.
- Suffixes : `XxxController`, `XxxService`, `XxxRepository`, `XxxRequest`, `XxxResponse`, `XxxMapper`.
- Endpoints : pluriel, minuscules, préfixe `/api` (ex. `/api/customers`).
- Tables SQL : `snake_case` au pluriel. Colonnes : `snake_case`.
- Erreurs : format JSON standardisé (`timestamp`, `status`, `error`, `message`, `path`).
- Aucun secret dans le dépôt : configuration via variables d'environnement.

## Frontend (Angular)

- Fichiers : `kebab-case` (ex. `customer-list.component.ts`).
- Structure : `core/`, `shared/`, `features/`, `layout/`.
- Un module (ou composant standalone) par feature, chargé en lazy loading.
- Formulaires : Reactive Forms uniquement.
- Un modèle TypeScript (interface) par ressource de l'API.

## Règles métier

Les règles de gestion sont préfixées par domaine pour éviter les doublons de
numérotation du cahier des charges : `RG-CMD-xx` (commandes), `RG-GEN-xx` (générales).