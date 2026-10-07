# Architecture

## Vue d'ensemble

```
Angular (frontend)  --HTTPS-->  Spring Boot REST API  -->  PostgreSQL
                                   (JWT, RBAC)
```

Architecture en trois niveaux. Le frontend est indépendant du backend et
communique uniquement via l'API REST au format JSON.

## Backend : flux des couches

```
controller  ->  service  ->  repository  ->  base de données
   (HTTP)     (logique métier)   (JPA)
```

- Le controller ne contient aucune logique métier.
- Le service porte les règles de gestion et les transactions.
- Les entités JPA ne sont jamais exposées par l'API : seuls des DTO circulent.

## Décisions d'architecture

| # | Décision | Justification |
|---|---|---|
| D1 | Migrations de schéma avec Flyway, `ddl-auto=validate` | Schéma versionné et reproductible (Docker, CI) |
| D2 | Montants en `BigDecimal` / `NUMERIC(14,3)` | Le dinar tunisien a 3 décimales, pas de `double` |
| D3 | Soft delete (champ `status`) pour clients et produits | Préserve l'historique des commandes et factures |
| D4 | Table `roles` (ADMIN, MANAGER, EMPLOYEE) + `@PreAuthorize` | Conforme au modèle du cahier des charges |
| D5 | DTO + MapStruct | Découplage API / persistance |
| D6 | Verrou optimiste (`@Version`) sur `Product` | Évite la survente en cas de commandes concurrentes |
| D7 | JWT stateless, logout côté client | Pas de refresh token dans le MVP |
| D8 | Prix unitaire figé dans `order_items` | Les anciennes commandes ne changent pas si le prix évolue |

## Points ouverts (à valider avant l'étape concernée)

- Table `stock_movements` en plus de `Product.quantity` (ajout par rapport au cahier des charges).
- Taux de TVA configurable (19 % par défaut).
- Restauration du stock lors de l'annulation d'une commande confirmée.
- Règles de cohérence entre `Invoice.status` et `Invoice.paymentStatus`.
- Droits exacts de l'employé sur produits et stock (lecture seule retenue).