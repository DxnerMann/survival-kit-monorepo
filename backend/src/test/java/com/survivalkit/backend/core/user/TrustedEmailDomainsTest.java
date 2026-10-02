package com.survivalkit.backend.core.user;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrustedEmailDomainsTest {

    @Test
    void acceptsCommonProvidersAndDhbw() {
        assertTrue(TrustedEmailDomains.isTrusted("jannis@gmx.de"));
        assertTrue(TrustedEmailDomains.isTrusted("Jannis@Gmail.com"));
        assertTrue(TrustedEmailDomains.isTrusted("li@web.de"));
        assertTrue(TrustedEmailDomains.isTrusted("li@t-online.de"));
        assertTrue(TrustedEmailDomains.isTrusted("li@yahoo.de"));
        assertTrue(TrustedEmailDomains.isTrusted("li@icloud.com"));
        assertTrue(TrustedEmailDomains.isTrusted("s123@dhbw-karlsruhe.de"));
        assertTrue(TrustedEmailDomains.isTrusted("s123@lehre.dhbw-stuttgart.de"));
    }

    @Test
    void rejectsDisposableProviders() {
        assertFalse(TrustedEmailDomains.isTrusted("bot@mailinator.com"));
        assertFalse(TrustedEmailDomains.isTrusted("bot@guerrillamail.com"));
        assertFalse(TrustedEmailDomains.isTrusted("bot@tempmail.com"));
        assertFalse(TrustedEmailDomains.isTrusted("bot@gmail.com.tempmail.net"));
        assertFalse(TrustedEmailDomains.isTrusted("not-an-email"));
    }
}
