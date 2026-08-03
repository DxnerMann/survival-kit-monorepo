package com.survivalkit.backend.adapter.postgres.quicklink;

import com.survivalkit.backend.shared.Page;

import java.util.List;

public interface QuickLinkPersistancePort {

    void incrementClickedLink(String id);
    void incrementFavCount(String id);
    Page<QuickLink> getQuickLinksFiltered(boolean approved, int pageSize, String continuation, boolean sortByPopularity);
    void approveQuickLink(String id, String title, String description);
    void deleteQuickLink(String id);
    List<QuickLink> getFromIds(List<String> ids);
    void upsertquickLink(QuickLink quickLink);
}
