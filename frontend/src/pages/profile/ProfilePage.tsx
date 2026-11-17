import "@/pages/profile/ProfilePage.css";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import {useEffect, useState} from "react";
import {LockKeyhole, Medal, SettingsIcon, Skull, Upload} from "lucide-react";
import Info from "@/components/ui/Info.tsx";
import CourseSelection from "@/components/ui/CourseSelection.tsx";
import type {ProfileSettings} from "@/models/ProfileSettings.tsx";
import {getUserRole} from "@/services/tokenService.tsx";
import {
    fetchProfileSettings,
    setShowInLeaderboard,
    setUserCourse,
    updateUsernameAndColor,
    uploadProfileImage
} from "@/services/userService.tsx";
import {api} from "@/services/api.tsx";
import {lectureService} from "@/services/lectureService.tsx";
import ProfilePictureDialog from "@/components/dialog/ProfilePictureDialog.tsx";
import ColorPicker from "@/components/ui/ColorPicker.tsx";
import Button from "@/components/ui/Button.tsx";
import Separator from "@/components/ui/Separator.tsx";
import Toggle from "@/components/ui/Toggle.tsx";
import {authService, validatePassword} from "@/services/authService.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";
import {useNavigate} from "react-router-dom";
import ConfirmDialog from "@/components/dialog/ConfirmDialog.tsx";
import ChangeEmailDialog from "@/components/dialog/ChangeEmailDialog.tsx";
import {useCountdownTimer} from "@/services/utils.tsx";
import {applyAccentOverride, readThemeAccent} from "@/services/accentColor.ts";
import {chooseDesign, getDesign} from "@/services/designService.ts";
import {getMyRank, getRankLadder} from "@/services/rankService.tsx";
import type {UserRank} from "@/models/UserRank.tsx";
import type {RankThreshold} from "@/models/RankThreshold.tsx";
import RankBadge from "@/components/rank/RankBadge.tsx";
import RankProgress from "@/components/rank/RankProgress.tsx";

const API_URL = api.baseUrl;

const roleLabel = (role: string | null) => {
    if (role === "ADMIN") return "Administrator";
    if (role === "MEMELORD") return "Memelord";
    if (role === "USER") return "Benutzer";
    return "Gast";
};

const formatXp = (xp: number) => new Intl.NumberFormat("de-DE").format(xp);

const tierName = (step: RankThreshold) =>
    step.division ? step.label.slice(0, step.label.length - step.division.length).trim() : step.label;

const groupLadder = (steps: RankThreshold[]) => {
    const groups: {tier: string; name: string; color: string; colorSoft: string; steps: RankThreshold[]}[] = [];
    for (const step of steps) {
        const last = groups[groups.length - 1];
        if (!last || last.tier !== step.tier) {
            groups.push({
                tier: step.tier,
                name: tierName(step),
                color: step.color,
                colorSoft: step.colorSoft,
                steps: [step],
            });
        } else {
            last.steps.push(step);
        }
    }
    return groups;
};

const RankTab = ({userId}: {userId?: string}) => {
    const [rank, setRank] = useState<UserRank | null | undefined>(undefined);
    const [ladder, setLadder] = useState<RankThreshold[]>([]);

    useEffect(() => {
        let cancelled = false;
        getMyRank()
            .then(next => {
                if (!cancelled) {
                    setRank(next);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setRank(null);
                }
            });
        getRankLadder()
            .then(steps => {
                if (!cancelled) {
                    setLadder(steps);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setLadder([]);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="profile-page-content">
            <SectionHeading heading={"Rang"} centered={false} />
            {rank === undefined ? (
                <p>Rang wird geladen…</p>
            ) : rank == null ? (
                <p>Rang konnte nicht geladen werden.</p>
            ) : (
                <div className="profile-rank">
                    <div
                        className="profile-rank__avatar"
                        style={{["--rank-color" as string]: rank.color, ["--rank-color-soft" as string]: rank.colorSoft}}
                    >
                        {userId && <img src={`${API_URL}/profile/img/${userId}`} alt="" />}
                    </div>
                    <div className="profile-rank__details">
                        <div className="profile-rank__copy">
                            <RankBadge tier={rank.tier} color={rank.color} colorSoft={rank.colorSoft} />
                            <div>
                                <h2>{rank.rankLabel}</h2>
                                <p>{rank.xp} XP</p>
                            </div>
                        </div>
                        <RankProgress
                            color={rank.color}
                            colorSoft={rank.colorSoft}
                            into={rank.xpIntoRank}
                            span={rank.xpSpan}
                            complete={rank.nextLabel == null}
                        />
                        <p className="profile-rank__need">
                            {rank.nextLabel
                                ? `Noch ${rank.xpRemaining} XP bis ${rank.nextLabel}`
                                : "Du hast den höchsten Rang erreicht."}
                        </p>
                    </div>
                </div>
            )}
            {ladder.length > 0 && (
                <section className="profile-rank-ladder" aria-label="Alle Ränge">
                    <h3 className="profile-page-subheading">Alle Ränge</h3>
                    <ol>
                        {groupLadder(ladder).map(group => (
                            <li
                                key={group.tier}
                                className={group.steps.length === 1 ? "profile-rank-ladder__tier profile-rank-ladder__tier--solo" : "profile-rank-ladder__tier"}
                                style={{["--rank-color" as string]: group.color, ["--rank-color-soft" as string]: group.colorSoft}}
                            >
                                <RankBadge tier={group.tier} color={group.color} colorSoft={group.colorSoft} size={group.steps.length === 1 ? 52 : 40} />
                                <span className="profile-rank-ladder__name">{group.name}</span>
                                <span className="profile-rank-ladder__divisions">
                                    {group.steps.map(step => {
                                        const current = rank?.rankId === step.id;
                                        const reached = rank != null && rank.xp >= step.minXp;
                                        const state = current ? "current" : reached ? "reached" : rank ? "ahead" : "";
                                        return (
                                            <span
                                                key={step.id}
                                                className={`profile-rank-ladder__step${state ? ` profile-rank-ladder__step--${state}` : ""}`}
                                                aria-current={current ? "true" : undefined}
                                            >
                                                {step.division && <span className="profile-rank-ladder__division">{step.division}</span>}
                                                <span className="profile-rank-ladder__xp">
                                                    {step.minXp === 0 ? "0 XP" : `ab ${formatXp(step.minXp)} XP`}
                                                </span>
                                            </span>
                                        );
                                    })}
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>
            )}
        </div>
    );
};

const ProfilePage = () => {
    const [currentTab, setCurrentTab] = useState<string>("PROFILE_SETTINGS")
    const [profileSettings, setprofileSettings] = useState<ProfileSettings>();
    const [selectedCourse, setSelectedCourse] = useState("");
    const [isVerified, setIsVerified] = useState(false);
    const [isPictureDialogOpen, setIsPictureDialogOpen] = useState(false);
    const [avatarVersion, setAvatarVersion] = useState(0);
    const [profileColor, setProfileColor] = useState("");
    const [accentColor, setAccentColor] = useState<string | null>(null);
    const [username, setUsername] = useState("");
    const [showInLeaderboard, setShowInLeaderboardState] = useState(true);
    const [modernDesign, setModernDesign] = useState(() => getDesign() === "modern");
    const [newPassword, setNewPassword] = useState("");
    const [oldPassword, setOldPassword] = useState("");
    const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showEmailDialog, setShowEmailDialog] = useState(false);
    const { secondsLeft, reset } = useCountdownTimer(0);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {

            const profileSettings = await fetchProfileSettings();
            setprofileSettings(profileSettings);
            setSelectedCourse(profileSettings.course ?? "");
            setProfileColor(profileSettings.color);
            setAccentColor(profileSettings.accentColor ?? null);
            applyAccentOverride(profileSettings.accentColor);
            setUsername(profileSettings.username);
            setIsVerified(profileSettings.isVerified);
            setShowInLeaderboardState(profileSettings.showInLeaderboard !== false);
        }
        fetchData();
    }, []);

    const tabs : string[] = [
        "PROFILE_SETTINGS",
        "RANK",
        "SECURITY",
        "DANGER_ZONE"
    ];

    const handleProfilePictureUpload = async (blob: Blob, isGif: boolean) => {
        await uploadProfileImage(blob, isGif);
        setAvatarVersion((v) => v + 1);
    };

    const handleSave = async () => {
        const colorChanged =
            profileSettings !== undefined && profileColor !== profileSettings.color;
        const usernameChanged =
            profileSettings !== undefined && username !== profileSettings.username;
        const savedAccent = profileSettings?.accentColor ?? null;
        const accentChanged = profileSettings !== undefined && accentColor !== savedAccent;

        try {
            const updates: {
                color?: string;
                username?: string;
                accentColor?: string | null;
            } = {};

            if (colorChanged) {
                updates.color = profileColor;
            }

            if (usernameChanged) {
                updates.username = username;
            }

            if (accentChanged) {
                updates.accentColor = accentColor;
            }

            if (colorChanged || usernameChanged || accentChanged) {
                await updateUsernameAndColor(updates);
                applyAccentOverride(accentColor);
                setprofileSettings({
                    username: username,
                    color: profileColor,
                    accentColor: accentColor,
                    course: profileSettings.course,
                    firstname: profileSettings.firstname,
                    lastname: profileSettings.lastname,
                    userId: profileSettings.userId,
                    email: profileSettings.email,
                    role: profileSettings.role,
                    isVerified: profileSettings.isVerified,
                })
            }
        } catch (error) {
            if (error instanceof Error) snackbarService.showSnackbar({type: "error", text: error.message, showIcon: true });
        }
    }

    const handleLogout = async () => {
        await authService.logout(() => navigate("/login"));
    }

    const handleAccountDeletion = async () => {
        await authService.deleteAccount(() => navigate("/login"));
    }

    const handleEmailChange = async (newEmail: string) => {
        await authService.changeEmail(newEmail, () => navigate("/login"));
    }

    const handleResend = async () => {
        try {
            await authService.resendVerification();
            snackbarService.showSnackbar({
                type: "success",
                text: "Bestätigungsmail wurde erneut gesendet.",
                showIcon: true,
            });
        } finally {
            reset(30)
        }
    }

    async function onCourseChanged(course: string) {
        setSelectedCourse(course);
        await setUserCourse(course);
    }

    async function onLinkChanged(link: string) {
        try {
            if (new URL(link).protocol !== 'https:') {
                return false
            }
        } catch {
            return false;
        }
        const course = await lectureService.extractCourse(link);
        setSelectedCourse(course);
    }

    const handlePasswordChange = async () => {
        if (!validatePassword(newPassword)) {
            snackbarService.showSnackbar({type: "error", text:"Passwort erfüllt die Anforderungen nicht", showIcon: true });
            return
        }

        if (newPassword !== newPasswordRepeat) {
            snackbarService.showSnackbar({type: "error", text:"Passwörter stimmen nicht überein", showIcon: true });
            return
        }

        try {
            await authService.changePassword(oldPassword, newPassword);
            snackbarService.showSnackbar({ type: "success",   text: "Passwort erfolgreich geändert", showIcon: true });
        } catch (e) {
            if (e instanceof Error) {
                snackbarService.showSnackbar({ type: "error",   text: e.message, showIcon: true });
            }
        }

    }

    const TabBar = () => {
        return <div className="profile-page-sidebar">
            {
                tabs.map(tab =>
                    <div
                        key={tab}
                        className={`profile-page-sidebar-tab ${currentTab === tab ? "active" : ""}`}
                        onClick={() => {
                            setCurrentTab(tab);
                        }}>
                        {
                            tab === "PROFILE_SETTINGS" ? <SettingsIcon size={20} /> : tab === "RANK" ? <Medal size={20} /> : tab === "SECURITY" ? < LockKeyhole size={20} /> : < Skull size={20} />
                        }
                        <h3 className="profile-page-sidebar-tab-name">{tab === "PROFILE_SETTINGS" ? "Profileinstellungen" : tab === "RANK" ? "Rang" : tab === "SECURITY" ? "Sicherheit & Privatsphäre" : "Danger Zone"}</h3>
                    </div>
                )
            }
        </div>
    }

    const TabContent = () => {
        switch (currentTab) {
            case "PROFILE_SETTINGS":
                return profileSettings === undefined ? <div className="profile-page-content">Lädt...</div> : Settings();
            case "RANK":
                return <RankTab userId={profileSettings?.userId} />;
            case "SECURITY":
                return profileSettings === undefined ? <div className="profile-page-content">Lädt...</div> : Security();
            case "DANGER_ZONE":
                return profileSettings === undefined ? <div className="profile-page-content">Lädt...</div> : Danger();
        }
    }

    const Settings = () => {

        if (profileSettings === undefined) {
            return;
        }

        return <>
            <div className="profile-page-content">
                <SectionHeading heading={"Profileinstellungen"} centered={false} />
                <div className="profile-settings-info-wrapper">
                    <div
                        className="profile-settings-img-wrapper"
                        style={{ border: `7px solid ${profileColor}` }}
                        onClick={() => setIsPictureDialogOpen(true)}
                    >
                        <img
                            src={`${API_URL}/profile/img/${profileSettings.userId}?v=${avatarVersion}`}
                            alt={"Profilbild"}
                            className="profile-settings-img"
                        />
                        <div className="profile-settings-img-overlay">
                            <Upload className="profile-settings-img-upload-icon" />
                        </div>
                    </div>
                    <div className="profile-settings-info">
                        <h2 className="profile-settings-full-name">{`${profileSettings.firstname} ${profileSettings.lastname}`}</h2>
                        <h3
                            className="profile-settings-username"
                            style={{ color: `${profileColor}` }}
                        >{`@${profileSettings.username}`}</h3>
                        <h3 className="profile-settings-email">{profileSettings.email}</h3>
                        <h3 className="profile-settings-course">{selectedCourse}</h3>
                        <h3 className="profile-settings-role">{roleLabel(getUserRole())}</h3>
                    </div>
                </div>
                <Info text={"Dein voller Name sowie deine E-Mail-Adresse sind nur für dich einsehbar. Dein Benutzername sowie dein Profilbild werden ggf. öffentlich angezeigt."} type={"SUCCESS"} />
                { !profileSettings.isVerified && <div className="not-varified-wrapper">
                    { !isVerified && <Info text="Deine E-Mail-Adresse ist noch nicht verifiziert. Du wirst einige Funktionen nicht vollumfänglich verwenden können." type="ERROR" />}
                    { isVerified && <Info text="Eine Bestätigungsmail wurde an die angegebene Adresse gesendet." type="INFO" />}
                    <Button text={secondsLeft <= 0 && !isVerified ? "Verifizieren" : secondsLeft <= 0 && isVerified ? "Erneut senden" : "Erneut senden in " + secondsLeft} disabled={secondsLeft > 0} onClick={handleResend} />
                </div> }
                <br />
                <Separator width={"100%"} height={"2px"} variant="secondary" />
                <div className="profile-page-settings-section">
                    <h2 className="profile-page-subheading">Kurs wechseln</h2>
                    <CourseSelection selectedCourse={selectedCourse} onCourseChanged={onCourseChanged} onLinkChanged={onLinkChanged} />
                </div>
                <Separator width={"100%"} height={"2px"} variant="secondary" />
                <div className="profile-page-settings-section">
                    <h2 className="profile-page-subheading">Benutzername anpassen</h2>
                    <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} />
                </div>
                <Separator width={"100%"} height={"2px"} variant="secondary" />
                <div className="profile-page-settings-section">
                    <h2 className="profile-page-subheading">Profilfarbe ändern</h2>
                    <div className="profile-settings-color-picker-wrapper">
                        <ColorPicker startValue={profileColor} onChange={(value) => setProfileColor(value)} />
                    </div>
                </div>
                <div className="profile-page-settings-section">
                    <h2 className="profile-page-subheading">Akzentfarbe</h2>
                    <div className="profile-settings-color-picker-wrapper">
                        <ColorPicker
                            startValue={accentColor ?? readThemeAccent()}
                            onChange={(value) => {
                                setAccentColor(value);
                                applyAccentOverride(value);
                            }}
                        />
                    </div>
                    <p className="profile-accent-hint">
                        Ohne eigene Farbe gilt die Standard-Akzentfarbe des hellen bzw. dunklen Designs. Eine eigene Farbe ersetzt das Rot in der ganzen App.
                    </p>
                    <Button
                        text="Auf Standard zurücksetzen"
                        variant="secondary"
                        disabled={accentColor === null}
                        onClick={() => {
                            setAccentColor(null);
                            applyAccentOverride(null);
                        }}
                    />
                </div>
                <div className="profile-page-settings-section">
                    <h2 className="profile-page-subheading">Design</h2>
                    <Toggle
                        checked={modernDesign}
                        label="Neues Design verwenden"
                        onChange={(enabled) => {
                            setModernDesign(enabled);
                            chooseDesign(enabled ? "modern" : "classic");
                        }}
                    />
                    <p className="profile-accent-hint">
                        Gilt sofort auf diesem Gerät. Feedback zum neuen Design ist immer erwünscht, am besten im Ideenhub.
                    </p>
                </div>
                < Button text={"Speichern"} onClick={() => handleSave()} />
            </div>
            <ProfilePictureDialog
                isOpen={isPictureDialogOpen}
                onClose={() => setIsPictureDialogOpen(false)}
                onUpload={handleProfilePictureUpload}
            />
        </>
    }

    const Security = () => {

        if (profileSettings === undefined) {
            return;
        }

        return <div className="profile-page-content">
            <SectionHeading heading={"Sicherheit & Privatsphäre"} centered={false} />
            <div className="profile-page-settings-section-security">
                <h2 className="profile-page-subheading">Leaderboard</h2>
                <Toggle
                    checked={showInLeaderboard}
                    label="Im Leaderboard anzeigen"
                    onChange={(visible) => {
                        const previous = showInLeaderboard;
                        setShowInLeaderboardState(visible);
                        setShowInLeaderboard(visible)
                            .then(() => {
                                setprofileSettings(current => current ? {...current, showInLeaderboard: visible} : current);
                            })
                            .catch(() => {
                                setShowInLeaderboardState(previous);
                                snackbarService.showSnackbar({type: "error", text: "Einstellung konnte nicht gespeichert werden", showIcon: true});
                            });
                    }}
                />
                <Info text={"Ausgeschaltet erscheint dein Name nicht in der Rangliste."} type={"INFO"} />
            </div>
            <br />
            <Separator width={"100%"} height={"2px"} variant="secondary" />
            <div className="profile-page-settings-section-security">
                <h2 className="profile-page-subheading">Passwort ändern</h2>
                <input placeholder="altes Passwort" type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} />
                <input placeholder="neues Passwort" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                <input placeholder="Passwort wiederholen" type="password" value={newPasswordRepeat} onChange={(event) => setNewPasswordRepeat(event.target.value)} />
                <Button text="Passwort ändern" onClick={() => handlePasswordChange()} />
                <Info text={"Du kannst dich anschließend nur noch mit deinem neuen Passwort anmelden."} type={"WARNING"} />
            </div>
            <br />
            <Separator width={"100%"} height={"2px"} variant="secondary" />
            <div className="profile-page-settings-section-security">
                <h2 className="profile-page-subheading">E-Mail-Adresse ändern</h2>
                <Button text="E-Mail-Adresse ändern" onClick={() => {setShowEmailDialog(true)}} />
                <Info text={"Deine bisherige Login-E-Mail-Adresse wird dadurch ersetzt."} type={"WARNING"} />
            </div>
            <br />
            <Separator width={"100%"} height={"2px"} variant="secondary" />
            <div className="profile-page-settings-section-security">
                <h2 className="profile-page-subheading">Abmelden</h2>
                <Button text="Abmelden" onClick={() => handleLogout()} />
            </div>
            < ChangeEmailDialog isOpen={showEmailDialog} onCancel={() => setShowEmailDialog(false)} onSubmit={handleEmailChange} title={"E-Mail-Adresse ändern"} subtitle={"Du musst dich im Anschluss mit deiner neuen E-Mail-Adresse neu anmelden."} oldEmail={profileSettings.email} />
        </div>
    }

    const Danger = () => {

        if (profileSettings === undefined) {
            return;
        }
        return <div className="profile-page-content">
            <SectionHeading heading={"Danger Zone"} centered={false} />
            <div className="profile-page-settings-section-danger">
                <h2 className="profile-page-subheading"><a className="important-text">Konto löschen</a></h2>
                <Button text="Konto löschen" onClick={() => setShowDeleteDialog(true)} />
                <Info text={"Die Löschung deines Kontos mit all deinen Daten ist unwiederuflich."} type={"ERROR"} />
            </div>
            <ConfirmDialog
                isOpen={showDeleteDialog}
                onCancel={() => setShowDeleteDialog(false)}
                onConfirm={() => {
                    setShowDeleteDialog(false);
                    return handleAccountDeletion();
                }}
                title={"Konto löschen"}
                subtitle={"Bist du sicher? Alle deine Daten werden unwiederuflich gelöscht."}
            />
        </div>
    }


    return <div className="survival-kit-page">
        <div className="profile-page">
            <div className="profile-page-wrapper">
                {
                    TabBar()
                }
                {
                    TabContent()
                }
            </div>
        </div>
    </div>
}

export default ProfilePage;