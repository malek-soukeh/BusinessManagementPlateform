package com.businessmanagementplateform.backend.service;

/** Actions recorded by hand. The others are built from the route: CREATE_ORDER, UPDATE_PRODUCT, DELETE_USER... */
public final class AuditActions {

    public static final String LOGIN = "LOGIN";
    public static final String LOGIN_FAILED = "LOGIN_FAILED";
    public static final String CHANGE_PASSWORD = "CHANGE_PASSWORD";

    private AuditActions() {
    }
}
