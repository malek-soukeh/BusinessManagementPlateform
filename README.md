# Business Management Platform

Plateforme web centralisée de gestion commerciale pour PME : clients, produits,
stocks, commandes, factures et paiements, avec tableau de bord et reporting.

> Projet fictif basé sur le cas **TechDistrib**, PME tunisienne de distribution de
> matériel informatique.

## Stack technique

| Couche | Technologies |
|---|---|
| Frontend | Angular 16, TypeScript, SCSS |
| Backend | Java 17, Spring Boot, Spring Security, JWT, Spring Data JPA |
| Base de données | PostgreSQL |
| API | REST, OpenAPI / Swagger |
| Tests | JUnit, Mockito |
| DevOps | Docker, Docker Compose, GitHub Actions |

## Structure du dépôt

```
BusinessManagementPlateform/
├── backend/     API Spring Boot
├── frontend/    Application Angular
├── docs/        Documentation technique et fonctionnelle
└── README.md
```

## État d'avancement

- [x] Initialisation backend et frontend
- [ ] Modèle de données
- [ ] Authentification JWT et rôles
- [ ] Modules métier
- [ ] Frontend
- [ ] Docker et CI/CD

## Documentation

- [Architecture](docs/architecture.md)
- [Conventions](docs/conventions.md)