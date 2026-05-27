package com.survivalkit.backend.adapter.web.quicklink;

import com.survivalkit.backend.adapter.postgres.quicklink.QuickLink;
import com.survivalkit.backend.core.qucklink.QuickLinkPort;
import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/v1/link")
public class QuickLinkController {

    private final QuickLinkPort quickLinkPort;

    public QuickLinkController(QuickLinkPort quickLinkPort) {
        this.quickLinkPort = quickLinkPort;
    }

    @Role(RoleLevel.GUEST)
    @PostMapping("/click")
    public ResponseEntity<Void> clickLink(@RequestParam String linkId) {
        quickLinkPort.clickLink(linkId);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.GUEST)
    @GetMapping()
    public ResponseEntity<Page<QuickLink>> getQuickLinksFiltered(
            @RequestParam(required = false) boolean approved,
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) String continuation
    ) {
        return ResponseEntity.ok(quickLinkPort.getQuickLinksFiltered(approved, pageSize, continuation));
    }

    @Role(RoleLevel.USER)
    @PostMapping()
    public ResponseEntity<Void> suggestLink(
            @RequestBody QuickLinkSuggestionRequest suggestion
    ) {
        quickLinkPort.suggestLink(suggestion);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.ADMIN)
    @PostMapping("/approve")
    public ResponseEntity<Void> approveOrDisApprove(
            @RequestBody QuickLinkApprovementRequest request
    ) {
        quickLinkPort.approveOrDisApprove(request);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.USER)
    @PostMapping("/favourite")
    public ResponseEntity<Void> markAsFav(
            @RequestParam String quickLinkId,
            @RequestParam boolean fav
    ) {
        quickLinkPort.markAsFav(quickLinkId, fav);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.USER)
    @GetMapping("/favourite")
    public ResponseEntity<Page<QuickLink>> getFavouritesFiltered(
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) String continuation
    ) {
        return ResponseEntity.ok(quickLinkPort.getFavouritesFiltered(pageSize, continuation));
    }
}
