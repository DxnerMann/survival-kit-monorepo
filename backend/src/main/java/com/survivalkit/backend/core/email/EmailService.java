package com.survivalkit.backend.core.email;

import com.survivalkit.backend.adapter.web.ErrorCode;
import jakarta.mail.MessagingException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class EmailService implements EmailPort {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;
    private final String publicBaseUrl;

    public EmailService(
            JavaMailSender mailSender,
            SpringTemplateEngine templateEngine,
            @Value("${app.public-base-url}") String publicBaseUrl
    ) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.publicBaseUrl = publicBaseUrl.endsWith("/")
                ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;
    }

    public void sendVerificationEmail(String email, String name, String token) {
        var context = new Context();
        context.setVariable("name", name);
        context.setVariable("verifyUrl",
                publicBaseUrl + "/v1/auth/verify?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8));

        var html = templateEngine.process("verification-email", context);

        var message = mailSender.createMimeMessage();
        try {
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(email);
            helper.setSubject("Verifiziere deine Eimail");
            helper.setText(html, true);
            helper.addInline("icon", new ClassPathResource("static/icon.png"));
            helper.setFrom("auth@lecture-survival-kit.jannis-saur.de", "Lecture Survival Kit");
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException(ErrorCode.FAILED_TO_SEND_EMAIL.getCode());
        } catch (UnsupportedEncodingException e) {
            throw new RuntimeException(e);
        }
    }
}
