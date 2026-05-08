package com.survivalkit.backend.core.auth;

import com.survivalkit.backend.adapter.postgres.user.UserModel;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.web.auth.LoginResponse;
import com.survivalkit.backend.adapter.web.auth.RegisterRequest;
import com.survivalkit.backend.core.auth.exception.InvalidCredentialsException;
import com.survivalkit.backend.core.auth.exception.UserAlreadyExistsException;
import com.survivalkit.backend.core.auth.exception.UserUnauthorizedException;
import com.survivalkit.backend.core.email.EmailPort;
import com.survivalkit.backend.core.security.TokenService;
import com.survivalkit.backend.shared.RoleLevel;
import io.jsonwebtoken.JwtException;
import io.viascom.nanoid.NanoId;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@Service
public class AuthService implements AuthPort {

    private final UserPersistancePort userPersistancePort;
    private final BCryptPasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final EmailPort emailPort;

    public AuthService(UserPersistancePort userPersistancePort, BCryptPasswordEncoder passwordEncoder, TokenService tokenService, EmailPort emailPort) {
        this.userPersistancePort = userPersistancePort;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.emailPort = emailPort;
    }

    @Override
    public void register(RegisterRequest request) {

        if (!isEmailValid(request.email()) || !isPasswordValid(request.password())) {
            throw new InvalidCredentialsException("Password or Email are not Valid");
        }

        var existingUser = userPersistancePort.findByEmailOrUsername(request.email(), request.username());

        if (existingUser.isPresent()) {
            if (existingUser.get().isVerified()) {
                throw new UserAlreadyExistsException(request.email(), request.username());
            } else {
                emailPort.sendVerificationEmail(request.email(), request.firstName(), existingUser.get().verificationToken());
                return;
            }
        }

        var userId = NanoId.generate(25);
        var token = tokenService.generateToken(userId, RoleLevel.USER, request.email());

        emailPort.sendVerificationEmail(request.email(), request.firstName(), token);

        userPersistancePort.save(
               new UserModel(
                       userId,
                       request.firstName(),
                       request.lastName(),
                       request.username(),
                       request.email(),
                       hashPassword(request.password()),
                       RoleLevel.USER,
                       token,
                       false
               )
        );
    }

    @Override
    public ModelAndView verify(String token) {
        try {
            var email = tokenService.extractEmail(token);
            var user = userPersistancePort.findByEmailOrUsername(email, "");

            if (user.isEmpty() || tokenService.validate(token).isEmpty()) {
                return new ModelAndView("verification-failed");
            }

            var loginUrl = ServletUriComponentsBuilder
                    .fromCurrentContextPath()
                    .path("/login")
                    .toUriString();

            if (user.get().isVerified()) {
                var mav = new ModelAndView("already-verified");
                mav.addObject("loginUrl", loginUrl);
                return mav;
            }

            userPersistancePort.setVerified(user.get().id(), true);

            var mav = new ModelAndView("verification-success");
            mav.addObject("loginUrl", loginUrl);
            return mav;

        } catch (JwtException | IllegalArgumentException e) {
            return new ModelAndView("verification-failed");
        }
    }

    @Override
    public LoginResponse login(String email, String password) {
        var user = userPersistancePort.findByEmailOrUsername(email, "");
        if (user.isEmpty() || !isPasswordCorrect(password, user.get().password())) {
            throw new InvalidCredentialsException("Invalid Email or Password");
        }
        var existingUser = user.get();
        if (!existingUser.isVerified()) {
            throw new UserUnauthorizedException("User is not yet Verified");
        }
        return new LoginResponse(
                tokenService.generateToken(existingUser.id(), existingUser.role(), existingUser.email()),
                existingUser.username(),
                existingUser.firstname(),
                existingUser.lastname()
        );
    }

    private String hashPassword(String password) {
        return passwordEncoder.encode(password);
    }

    private boolean isPasswordCorrect(String plainPassword, String hashedPassword) {
        return passwordEncoder.matches(plainPassword, hashedPassword);
    }

    private static boolean isPasswordValid(String password) {
        if (password == null) return false;

        boolean hasMinLength   = password.length() >= 8;
        boolean hasUppercase   = password.chars().anyMatch(Character::isUpperCase);
        boolean hasLowercase   = password.chars().anyMatch(Character::isLowerCase);
        boolean hasDigit       = password.chars().anyMatch(Character::isDigit);
        boolean hasSpecial     = password.chars().anyMatch(c -> "!@#$%^&*()-_=+[]{}|;:',.<>?/`~".indexOf(c) >= 0);
        boolean hasNoSpaces    = !password.contains(" ");

        return hasMinLength && hasUppercase && hasLowercase && hasDigit && hasSpecial && hasNoSpaces;
    }

    private static boolean isEmailValid(String email) {
        if (email == null) return false;

        if (!email.matches("\\A\\p{ASCII}*\\z")) return false;

        String pattern = "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$";
        if (!email.matches(pattern)) return false;

        if (email.contains("..")) return false;

        String[] parts = email.split("@");
        if (parts[0].length() > 64) return false;
        if (email.length() > 254) return false;

        return true;
    }
}
