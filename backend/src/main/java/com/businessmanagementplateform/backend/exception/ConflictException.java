package com.businessmanagementplateform.backend.exception;

public class ConflictException extends RuntimeException {

    private final ErrorCode code;

    /** A conflict without a specific code: it is reported as {@link ErrorCode#CONFLICT}. */
    public ConflictException(String message) {
        this(ErrorCode.CONFLICT, message);
    }

    public ConflictException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode getCode() {
        return code;
    }
}
