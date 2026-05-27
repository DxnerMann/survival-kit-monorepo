package com.survivalkit.backend.shared;

import java.util.List;

public record Page<T>(List<T> data, String continuation) {}