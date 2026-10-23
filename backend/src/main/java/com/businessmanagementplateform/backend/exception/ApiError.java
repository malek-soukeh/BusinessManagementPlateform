package com.businessmanagementplateform.backend.exception;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/** JSON body of every error of the API, including the 401 and 403 written by the security filters. */
public record ApiError(
        @Schema(description = "Moment de l'erreur (ISO-8601, UTC).", example = "2026-10-23T00:30:00.123Z")
        Instant timestamp,
        @Schema(description = "Code HTTP.", example = "409")
        int status,
        @Schema(description = "Nom du statut HTTP.", example = "CONFLICT")
        String error,
        @Schema(description = "Identifiant stable de l'erreur, à utiliser côté client plutôt que le message.",
                example = "EMAIL_ALREADY_USED")
        ErrorCode code,
        @Schema(description = "Message technique en anglais, susceptible d'être reformulé.",
                example = "Email already in use: ahmed@email.com")
        String message,
        @Schema(description = "Chemin de la requête.", example = "/api/customers")
        String path
) {
}
