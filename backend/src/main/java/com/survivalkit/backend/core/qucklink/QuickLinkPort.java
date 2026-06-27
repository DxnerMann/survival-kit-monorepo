package com.survivalkit.backend.core.qucklink;

import com.survivalkit.backend.adapter.postgres.quicklink.QuickLink;
import com.survivalkit.backend.adapter.web.quicklink.QuickLinkApprovementRequest;
import com.survivalkit.backend.adapter.web.quicklink.QuickLinkSuggestionRequest;
import com.survivalkit.backend.shared.Page;
import org.springframework.web.bind.annotation.RequestParam;

public interface QuickLinkPort {
    void clickLink(@RequestParam String linkId);
    Page<QuickLink> getQuickLinksFiltered(boolean approved, Integer pageSize, String continuation, boolean sortByPopularity);
    void suggestLink(QuickLinkSuggestionRequest suggestion);
    void approveOrDisApprove(QuickLinkApprovementRequest request);
    void markAsFav(String quickLinkId, boolean fav);
    Page<QuickLink> getFavouritesFiltered(Integer pageSize, String continuation);

}
