import './ProfilePage.css';
import Footer from "../../components/Footer.tsx";
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import {useEffect, useState} from "react";
import {LockKeyhole, SettingsIcon, Skull, Upload} from "lucide-react";
import Info from "../../components/shared/Info.tsx";
import CourseSelection from "../../components/shared/CourseSelection.tsx";
import type {ProfileSettings} from "../../models/ProfileSettings.tsx";
import {getUserRole} from "../../services/tokenService.tsx";
import {
    fetchProfileSettings,
    setUserCourse,
    updateUsernameAndColor,
    uploadProfileImage
} from "../../services/userService.tsx";
import {api} from "../../services/api.tsx";
import {lectureService} from "../../services/lectureService.tsx";
import ProfilePictureDialog from "../../components/shared/dialog/ProfilePictureDialog.tsx";
import ColorPicker from "../../components/shared/ColorPicker.tsx";
import Button from "../../components/shared/Button.tsx";
import Separator from "../../components/shared/Seperator.tsx";
import {validatePassword} from "../../services/authService.tsx";
import {snackbarService} from "../../services/snackBarService.tsx";

const API_URL = api.baseUrl;

const ProfilePage = () => {
    const [currentTab, setCurentTab] = useState<string>("PROFILE_SETTINGS")
    const [profileSettings, setprofileSettings] = useState<ProfileSettings>();
    const [selectedCourse, setSelectedCourse] = useState("");
    const [isPictureDialogOpen, setIsPictureDialogOpen] = useState(false);
    const [avatarVersion, setAvatarVersion] = useState(0);
    const [profileColor, setProfileColor] = useState("");
    const [username, setUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {

            const profileSettings = await fetchProfileSettings();
            setprofileSettings(profileSettings);
            setSelectedCourse(profileSettings.course);
            setProfileColor(profileSettings.color);
            setUsername(profileSettings.username);
        }
        fetchData();
    }, []);

    const tabs : string[] = [
        "PROFILE_SETTINGS",
        "SECURITY",
        "DANGER_ZONE"
    ];

    const handleProfilePictureUpload = async (blob: Blob, isGif: boolean) => {
        await uploadProfileImage(blob, isGif);
        setAvatarVersion((v) => v + 1);
    };

    const handleSave = async () => {
        setError("");
        const colorChanged =
            profileSettings !== undefined && profileColor !== profileSettings.color;
        const usernameChanged =
            profileSettings !== undefined && username !== profileSettings.username;

        try {
            const updates: {
                color?: string;
                username?: string;
            } = {};

            if (colorChanged) {
                updates.color = profileColor;
            }

            if (usernameChanged) {
                updates.username = username;
            }

            if (colorChanged || usernameChanged) {
                await updateUsernameAndColor(updates);
                setprofileSettings({
                    username: username,
                    color: profileSettings.color,
                    course: profileSettings.course,
                    firstname: profileSettings.firstname,
                    lastname: profileSettings.lastname,
                    userId: profileSettings.userId,
                    email: profileSettings.email,
                    role: profileSettings.role
                })
            }
        } catch (error) {
            if (error instanceof Error) setError(error.message);
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
            setError('Passwort erfüllt die Anforderungen nicht')
            return
        }

        if (newPassword !== newPasswordRepeat) {
            setError('Passwörter stimmen nicht überein')
            return
        }

        // TODO: Change Password
        snackbarService.showSnackbar({ type: "success",   text: "Passwort erfolgreich geändert", showIcon: true });
    }

    const TabBar = () => {
        return <div className="profile-page-sidebar">
            {
                tabs.map(tab =>
                    <div
                        key={tab}
                        className={`profile-page-sidebar-tab ${currentTab === tab ? "active" : ""}`}
                        onClick={() => {
                            setCurentTab(tab);
                            setError("");
                        }}>
                        {
                            tab === "PROFILE_SETTINGS" ? <SettingsIcon size={20} /> : tab === "SECURITY" ? < LockKeyhole size={20} /> : < Skull size={20} />
                        }
                        <h3 className="profile-page-sidebar-tab-name">{tab === "PROFILE_SETTINGS" ? "Profileinstellungen" : tab === "SECURITY" ? "Sicherheit" : "Danger Zone"}</h3>
                    </div>
                )
            }
        </div>
    }

    const TabContent = () => {
        switch (currentTab) {
            case "PROFILE_SETTINGS":
                return profileSettings === undefined ? <div className="profile-page-content">Lädt...</div> : Settings();
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
                            alt={"Profile Picture"}
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
                        <h3 className="profile-settings-role">{getUserRole() === "USER" ? "Benutzer" : getUserRole() === "ADMIN" ? "Admininstrator" : "Gast"}</h3>
                    </div>
                </div>
                <Info text={"Dein voller name, sowie deine Email-Adresse sind nur für dich einsehbar. Dein Benutzername, sowie dein Profilbild werden ggf. Öffentlich angezeit!"} type={"SUCCESS"} />
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
                <div className="error-text">
                    <a>{error}</a>
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

        /*
        * TODO:
        *  - Add Change Password Functionality
        */

        return <div className="profile-page-content">
            <SectionHeading heading={"Sicherheit"} centered={false} />
            <div className="profile-page-settings-section-security">
                <h2 className="profile-page-subheading">Passwort ändern</h2>
                <input placeholder="neues Passwort" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                <input placeholder="Passwort wiederholen" type="password" value={newPasswordRepeat} onChange={(event) => setNewPasswordRepeat(event.target.value)} />
                <div className="error-text">
                    <a>{error}</a>
                </div>
                <Button text="Passwort ändern" onClick={() => handlePasswordChange()} />
                <Info text={"Du kannst dich anschließend nurnoch mit deinem neuen Passwort anmelden"} type={"WARNING"} />
            </div>
            <br />
            <Separator width={"100%"} height={"2px"} variant="secondary" />
            <div className="profile-page-settings-section-security">
                <h2 className="profile-page-subheading">Email-Adresse ändern</h2>
                <Button text="Email-Adresse ändern" onClick={() => {/* TODO */}} />
                <Info text={"Deine bissherige Login Email-Adresse wird dadurch ersetzt."} type={"WARNING"} />
            </div>
        </div>
    }

    const Danger = () => {

        if (profileSettings === undefined) {
            return;
        }

        /*
        * TODO:
        *  - Add Delete Account Functionality
        */

        return <div className="profile-page-content">
            <SectionHeading heading={"Danger Zone"} centered={false} />
            <div className="profile-page-settings-section-danger">
                <h2 className="profile-page-subheading"><a className="important-text">Konto Löschen</a></h2>
                <Button text="Konto Löschen" onClick={() => {/* TODO */}} />
                <Info text={"Die Löschung deines Kontos mit all deinen Daten ist unwiederuflich."} type={"ERROR"} />
            </div>
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
        <Footer />
    </div>
}

export default ProfilePage;