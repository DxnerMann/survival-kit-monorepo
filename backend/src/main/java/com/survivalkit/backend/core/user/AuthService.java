package com.survivalkit.backend.core.user;

import com.survivalkit.backend.adapter.postgres.favourites.FavouritePersistancePort;
import com.survivalkit.backend.adapter.postgres.feedback.FeedbackPersistancePort;
import com.survivalkit.backend.adapter.postgres.quicklink.QuickLinkPersistancePort;
import com.survivalkit.backend.adapter.postgres.user.UserModel;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.adapter.postgres.usetracking.UserTrackingPersistancePort;
import com.survivalkit.backend.adapter.postgres.widget.UserWidgetPersistancePort;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.adapter.web.auth.LoginResponse;
import com.survivalkit.backend.adapter.web.auth.RegisterRequest;
import com.survivalkit.backend.config.SecurityContext;
import com.survivalkit.backend.core.user.exception.CannotDeleteLastAdminException;
import com.survivalkit.backend.core.user.exception.InvalidCredentialsException;
import com.survivalkit.backend.core.user.exception.UserAlreadyExistsException;
import com.survivalkit.backend.core.user.exception.UserUnauthorizedException;
import com.survivalkit.backend.core.email.EmailPort;
import com.survivalkit.backend.core.security.TokenService;
import com.survivalkit.backend.core.statistics.StatisticsPort;
import com.survivalkit.backend.shared.RoleLevel;
import io.jsonwebtoken.JwtException;
import io.viascom.nanoid.NanoId;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.ModelAndView;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;

@Service
public class AuthService implements AuthPort {

    private final UserPersistancePort userPersistancePort;
    private final BCryptPasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final EmailPort emailPort;
    private final StatisticsPort statisticsPort;
    private final UserPort userPort;
    private final UserWidgetPersistancePort userWidgetPersistancePort;
    private final UserTrackingPersistancePort userTrackingPersistancePort;
    private final QuickLinkPersistancePort quickLinkPersistancePort;
    private final FeedbackPersistancePort feedbackPersistancePort;
    private final FavouritePersistancePort favouritePersistancePort;

    public AuthService(UserPersistancePort userPersistancePort, BCryptPasswordEncoder passwordEncoder, TokenService tokenService, EmailPort emailPort, StatisticsPort statisticsPort, UserPort userPort, UserWidgetPersistancePort userWidgetPersistancePort, UserTrackingPersistancePort userTrackingPersistancePort, QuickLinkPersistancePort quickLinkPersistancePort, FeedbackPersistancePort feedbackPersistancePort, FavouritePersistancePort favouritePersistancePort) {
        this.userPersistancePort = userPersistancePort;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.emailPort = emailPort;
		this.statisticsPort = statisticsPort;
        this.userPort = userPort;
        this.userWidgetPersistancePort = userWidgetPersistancePort;
        this.userTrackingPersistancePort = userTrackingPersistancePort;
        this.quickLinkPersistancePort = quickLinkPersistancePort;
        this.feedbackPersistancePort = feedbackPersistancePort;
        this.favouritePersistancePort = favouritePersistancePort;
    }

    @Override
    public void register(RegisterRequest request) {

        if (!isEmailValid(request.email()) || isPasswordInvalid(request.password())) {
            throw new InvalidCredentialsException(ErrorCode.INVALID_PASSWORD_OR_EMAIL.getCode());
        }

        var existingUser = userPersistancePort.findByEmailOrUsername(request.email(), request.username());

        if (existingUser.isPresent()) {
            if (existingUser.get().isVerified()) {
                throw new UserAlreadyExistsException(ErrorCode.USER_ALREADY_EXISTS.getCode());
            } else {
                emailPort.sendVerificationEmail(request.email(), request.firstName(), existingUser.get().verificationToken());
                return;
            }
        }

        var userId = NanoId.generate(25);
        var token = tokenService.generateToken(userId, RoleLevel.USER, request.email(), request.username());

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
                       false,
                       null,
                       String.format("#%06X", new SecureRandom().nextInt(0xFFFFFF + 1)),
                       userPort.getDefaultProfilePicture(),
                       Instant.now()
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

            var loginUrl = "https://lecture-survival-kit.jannis-saur.de/login";

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
        if (user.isEmpty() || isPasswordIncorrect(password, user.get().password())) {
            throw new InvalidCredentialsException(ErrorCode.INVALID_PASSWORD_OR_EMAIL.getCode());
        }
        var existingUser = user.get();

        return new LoginResponse(
                tokenService.generateToken(existingUser.id(), existingUser.role(), existingUser.email(), existingUser.username()),
                existingUser.username(),
                existingUser.firstname(),
                existingUser.lastname()
        );
    }

    @Override
    public LoginResponse validate() {
        var user = SecurityContext.current();

        if (tokenService.validate(user.token()).isEmpty()) {
            throw new UserUnauthorizedException(ErrorCode.TOKEN_INVALID_OR_EXPIRED.getCode());
        }

        var existingUser = userPersistancePort.findByEmailOrUsername(user.email(), "");
        if (existingUser.isEmpty()) {
            throw new UserUnauthorizedException(ErrorCode.USER_DOES_NOT_EXIST.getCode());
        }
        statisticsPort.saveTrackAction(TrackAction.Action.LOGGED_IN);
        return new LoginResponse(
                tokenService.generateToken(user.userId(), user.role(), user.email(), user.username()),
                user.username(),
                existingUser.get().firstname(),
                existingUser.get().lastname()
        );
    }

    @Override
    public LoginResponse changePassword(String oldPassword, String newPassword) {
        var authUser = SecurityContext.current();

        var user = userPersistancePort.getById(authUser.userId());
        if (user.isEmpty() || isPasswordIncorrect(oldPassword, user.get().password())) {
            throw new InvalidCredentialsException(ErrorCode.OLD_PASSWORD_INVALID.getCode());
        }

        var existingUser = user.get();

        if (!existingUser.isVerified()) {
            throw new UserUnauthorizedException(ErrorCode.NOT_VERIFIED.getCode());
        }
        if (isPasswordInvalid(newPassword)) {
            throw new InvalidCredentialsException(ErrorCode.PASSWORD_NOT_VALID.getCode());
        }
        userPersistancePort.updatePassword(existingUser.id(), hashPassword(newPassword));
        return new LoginResponse(
                tokenService.generateToken(existingUser.id(), existingUser.role(), existingUser.email(), existingUser.username()),
                existingUser.username(),
                existingUser.firstname(),
                existingUser.lastname()
        );
    }

    @Override
    public void logout() {
        var authUser = SecurityContext.current();
        tokenService.revoke(authUser.token());
    }

    @Override
    @Transactional
    public void deleteAccount() {
        var authUser = SecurityContext.current();
        var userId = authUser.userId();

        if (userPersistancePort.isLastAdmin(userId)) {
            throw new CannotDeleteLastAdminException(ErrorCode.UNABLE_TO_DELETE_LAST_ADMIN.getCode());
        }

        favouritePersistancePort.deleteAll(userId);
        userWidgetPersistancePort.overrideAll(List.of(), userId);
        feedbackPersistancePort.deleteAllVotes(userId);
        feedbackPersistancePort.deleteUser(userId);
        userPersistancePort.deleteUser(userId);


    }

    @Override
    public void changeEmail(String email) {
        var authUser = SecurityContext.current();
        var userId = authUser.userId();

        if (!isEmailValid(email)) {
            throw new InvalidCredentialsException(ErrorCode.EMAIL_NOT_VALID.getCode());
        }

        var existingUser = userPersistancePort.findByEmailOrUsername(email, "");

        if (existingUser.isPresent()) {
            if (existingUser.get().isVerified()) {
                throw new UserAlreadyExistsException(ErrorCode.USER_ALREADY_EXISTS.getCode());
            }
        }

        var user = userPersistancePort.getById(authUser.userId());

        if (user.isPresent()) {
            var token = tokenService.generateToken(userId, RoleLevel.USER, email, user.get().username());

            emailPort.sendVerificationEmail(email, user.get().firstname(), token);
            userPersistancePort.changeEmail(userId, email, token);

            logout();
        }
    }

    @Override
    public void sendVerifcationEmailAgain() {
        var authUser = SecurityContext.current();
        var user = userPersistancePort.getById(authUser.userId());
        user.ifPresent(userModel -> emailPort.sendVerificationEmail(userModel.email(), userModel.firstname(), userModel.verificationToken()));
    }

    private String hashPassword(String password) {
        return passwordEncoder.encode(password);
    }

    private boolean isPasswordIncorrect(String plainPassword, String hashedPassword) {
        return !passwordEncoder.matches(plainPassword, hashedPassword);
    }

    private static boolean isPasswordInvalid(String password) {
        if (password == null) return true;

        boolean hasMinLength   = password.length() >= 8;
        boolean hasUppercase   = password.chars().anyMatch(Character::isUpperCase);
        boolean hasLowercase   = password.chars().anyMatch(Character::isLowerCase);
        boolean hasDigit       = password.chars().anyMatch(Character::isDigit);
        boolean hasSpecial     = password.chars().anyMatch(c -> "!@#$%^&*()-_=+[]{}|;:',.<>?/`~".indexOf(c) >= 0);
        boolean hasNoSpaces    = !password.contains(" ");

        return !hasMinLength || !hasUppercase || !hasLowercase || !hasDigit || !hasSpecial || !hasNoSpaces;
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
