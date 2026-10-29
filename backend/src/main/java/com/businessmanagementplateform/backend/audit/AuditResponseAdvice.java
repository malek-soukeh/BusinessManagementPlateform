package com.businessmanagementplateform.backend.audit;

import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.lang.reflect.RecordComponent;
import java.util.List;

/**
 * Remembers, for the audit trail, which record a creation or an update answered with: its id and a readable
 * label (order number, reference, e-mail...). The response is not modified.
 */
@RestControllerAdvice
public class AuditResponseAdvice implements ResponseBodyAdvice<Object> {

    static final String ATTRIBUTE = AuditResponseAdvice.class.getName() + ".target";

    /** Fields of a response that name the record, the first one present wins. */
    private static final List<String> LABEL_FIELDS = List.of("orderNumber", "invoiceNumber", "reference", "name", "email");

    record Target(Long id, String label) {
    }

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        if (body instanceof Record rec
                && request instanceof ServletServerHttpRequest servletRequest
                && AuditActionResolver.isMutating(servletRequest.getServletRequest().getMethod())) {
            servletRequest.getServletRequest().setAttribute(ATTRIBUTE, targetOf(rec));
        }
        return body;
    }

    static Target targetOf(Record body) {
        Long id = null;
        String label = null;
        String labelField = null;
        try {
            for (RecordComponent component : body.getClass().getRecordComponents()) {
                var accessor = component.getAccessor();
                accessor.trySetAccessible();
                Object value = accessor.invoke(body);
                String name = component.getName();
                if (name.equals("id") && value instanceof Number number) {
                    id = number.longValue();
                } else if (value instanceof String text && !text.isBlank() && LABEL_FIELDS.contains(name)
                        && (labelField == null || LABEL_FIELDS.indexOf(name) < LABEL_FIELDS.indexOf(labelField))) {
                    label = text;
                    labelField = name;
                }
            }
        } catch (ReflectiveOperationException | RuntimeException ex) {
            // The label is a convenience: the entry is recorded anyway.
        }
        return new Target(id, label);
    }
}
