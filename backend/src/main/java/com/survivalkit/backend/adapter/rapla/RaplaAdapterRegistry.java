package com.survivalkit.backend.adapter.rapla;

import com.survivalkit.backend.adapter.rapla.adapter.RaplaAdapter;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class RaplaAdapterRegistry {

    private final Map<String, RaplaAdapter> adaptersById;
    private final List<RaplaAdapter> adapters;

    public RaplaAdapterRegistry(List<RaplaAdapter> adapters) {
        this.adapters = List.copyOf(adapters);
        var byId = new LinkedHashMap<String, RaplaAdapter>();
        for (var adapter : adapters) {
            byId.put(adapter.id(), adapter);
        }
        this.adaptersById = Map.copyOf(byId);
    }

    public RaplaAdapter resolveForUrl(String url) {
        return adapters.stream()
                .filter(adapter -> adapter.supports(url))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported Rapla URL: " + url));
    }

    public RaplaAdapter getById(String adapterId) {
        var adapter = adaptersById.get(adapterId);
        if (adapter == null) {
            throw new IllegalArgumentException("Unknown Rapla adapter: " + adapterId);
        }
        return adapter;
    }

    public List<RaplaAdapter> all() {
        return adapters;
    }
}
