package com.businessmanagementplateform.backend.exception;

public class ResourceNotFoundException extends RuntimeException {

    private final ErrorCode code;

    /** A missing resource without a specific code: it is reported as {@link ErrorCode#RESOURCE_NOT_FOUND}. */
    public ResourceNotFoundException(String message) {
        this(ErrorCode.RESOURCE_NOT_FOUND, message);
    }

    public ResourceNotFoundException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode getCode() {
        return code;
    }
}
