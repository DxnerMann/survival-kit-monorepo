package com.survivalkit.backend.adapter.web.profile;

import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;

public record ProfileImageResponse(Resource resource, MediaType contentType) {
}
