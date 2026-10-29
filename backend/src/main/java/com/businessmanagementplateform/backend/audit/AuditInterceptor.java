package com.businessmanagementplateform.backend.audit;

import com.businessmanagementplateform.backend.security.CurrentUser;
import com.businessmanagementplateform.backend.service.AuditEntry;
import com.businessmanagementplateform.backend.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Records every successful creation, update or deletion of the API in the audit trail.
 * Only a 2xx answer is recorded: a refused operation changed nothing.
 */
@Component
public class AuditInterceptor implements HandlerInterceptor {

    private final AuditService auditService;
    private final CurrentUser currentUser;

    public AuditInterceptor(AuditService auditService, CurrentUser currentUser) {
        this.auditService = auditService;
        this.currentUser = currentUser;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
                                Exception ex) {
        int status = response.getStatus();
        if (status < 200 || status >= 300) {
            return;
        }

        String path = request.getRequestURI();
        AuditActionResolver.resolve(request.getMethod(), path).ifPresent(resolved -> {
            AuditResponseAdvice.Target target = request.getAttribute(AuditResponseAdvice.ATTRIBUTE)
                    instanceof AuditResponseAdvice.Target found ? found : null;
            Long id = resolved.entityId() != null ? resolved.entityId() : target == null ? null : target.id();
            String label = target == null ? null : target.label();

            auditService.record(new AuditEntry(currentUser.email(), resolved.action(), resolved.entityType(),
                    id, label, request.getMethod(), path, resolved.details()));
        });
    }
}
