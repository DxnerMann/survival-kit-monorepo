package com.survivalkit.backend.core.user;

import java.util.Locale;
import java.util.Set;

public final class TrustedEmailDomains {

    private static final Set<String> DOMAINS = Set.of(
            "gmail.com",
            "googlemail.com",
            "yahoo.com",
            "yahoo.de",
            "yahoo.co.uk",
            "ymail.com",
            "rocketmail.com",
            "gmx.de",
            "gmx.net",
            "gmx.at",
            "gmx.ch",
            "gmx.com",
            "web.de",
            "t-online.de",
            "icloud.com",
            "me.com",
            "mac.com",
            "privaterelay.appleid.com",
            "outlook.com",
            "outlook.de",
            "hotmail.com",
            "hotmail.de",
            "live.com",
            "live.de",
            "msn.com",
            "proton.me",
            "protonmail.com",
            "pm.me",
            "aol.com",
            "aol.de",
            "freenet.de",
            "posteo.de",
            "mailbox.org",
            "arcor.de",
            "vodafone.de",
            "online.de",
            "dhbw.de",
            "dhbw-karlsruhe.de",
            "dhbw-mannheim.de",
            "dhbw-stuttgart.de",
            "dhbw-ravensburg.de",
            "dhbw-mosbach.de",
            "dhbw-heilbronn.de",
            "dhbw-loerrach.de",
            "dhbw-vs.de",
            "dhbw-heidenheim.de"
    );

    private TrustedEmailDomains() {}

    public static boolean isTrusted(String email) {
        var domain = domainOf(email);
        if (domain == null) {
            return false;
        }
        for (var trusted : DOMAINS) {
            if (domain.equals(trusted) || domain.endsWith("." + trusted)) {
                return true;
            }
        }
        return false;
    }

    private static String domainOf(String email) {
        if (email == null) {
            return null;
        }
        var at = email.lastIndexOf('@');
        if (at < 0 || at == email.length() - 1) {
            return null;
        }
        var domain = email.substring(at + 1).trim().toLowerCase(Locale.ROOT);
        if (domain.endsWith(".")) {
            domain = domain.substring(0, domain.length() - 1);
        }
        return domain.isBlank() ? null : domain;
    }
}
