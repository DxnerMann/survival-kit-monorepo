package com.survivalkit.backend.core.email;

import jakarta.mail.MessagingException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.context.Context;

import java.io.UnsupportedEncodingException;

@Service
public class EmailService implements EmailPort {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    public EmailService(JavaMailSender mailSender, SpringTemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }

    public void sendVerificationEmail(String email, String name, String token) {
        var context = new Context();
        context.setVariable("name", name);
        context.setVariable("verifyUrl",
                ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("api/v1/auth/verify")
                .queryParam("token", token)
                .toUriString());

        var html = templateEngine.process("verification-email", context);

        var message = mailSender.createMimeMessage();
        try {
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(email);
            helper.setSubject("Verifiziere deine Eimail");
            helper.setText(html, true);
            helper.addInline("icon", new ClassPathResource("static/icon.png"));
            helper.setFrom("your@gmail.com", "Lecture Survival Kit");
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send email", e);
        } catch (UnsupportedEncodingException e) {
            throw new RuntimeException(e);
        }
    }
}