import './ProfilePage.css';
import Footer from "../../components/Footer.tsx";
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import {useEffect, useState} from "react";
import {LockKeyhole, SettingsIcon, Skull} from "lucide-react";
import Info from "../../components/shared/Info.tsx";
import CourseSelection from "../../components/shared/CourseSelection.tsx";
import type {ProfileSettings} from "../../models/ProfileSettings.tsx";
import {getUserRole} from "../../services/tokenService.tsx";
import {fetchProfileSettings, setUserCourse} from "../../services/userService.tsx";
import {api} from "../../services/api.tsx";
import {lectureService} from "../../services/lectureService.tsx";

const API_URL = api.baseUrl;

const ProfilePage = () => {
    const [currentTab, setCurentTab] = useState<string>("PROFILE_SETTINGS")
    const [profileSettings, setprofileSettings] = useState<ProfileSettings>();
    const [selectedCourse, setSelectedCourse] = useState("");

    useEffect(() => {
        const fetchData = async () => {

            const profileSettings = await fetchProfileSettings();
            setprofileSettings(profileSettings);
            setSelectedCourse(profileSettings.course);
        }
        fetchData();
    }, []);

    const tabs : string[] = [
        "PROFILE_SETTINGS",
        "SECURITY",
        "DANGER_ZONE"
    ];

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

    const TabBar = () => {
        return <div className="profile-page-sidebar">
            {
                tabs.map(tab =>
                    <div
                        key={tab}
                        className={`profile-page-sidebar-tab ${currentTab === tab ? "active" : ""}`}
                        onClick={() => setCurentTab(tab)}>
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

        /*
        * TODO:
        *  - Profile Picture Zoom / Fullscreen
        *  - Add Profile Accent Color Functionality
        */

        return <div className="profile-page-content">
            <SectionHeading heading={"Profileinstellungen"} centered={false} />
            <div className="profile-settings-info-wrapper">
                <div className="profile-settings-img-wrapper">
                    <img src={`${API_URL}/profile/img/${profileSettings.userId}`} alt={"Profile Picture"} />
                </div>
                <div className="profile-settings-info">
                    <h2 className="profile-settings-full-name">{`${profileSettings.firstname} ${profileSettings.lastname}`}</h2>
                    <h3 className="profile-settings-username">{`@${profileSettings.username}`}</h3>
                    <h3 className="profile-settings-email">{profileSettings.email}</h3>
                    <h3 className="profile-settings-course">{selectedCourse}</h3>
                    <h3 className="profile-settings-role">{getUserRole() === "USER" ? "Benutzer" : getUserRole() === "ADMIN" ? "Admininstrator" : "Gast"}</h3>
                </div>
            </div>
            <Info text={"Dein voller name, sowie deine Email-Adresse sind nur für dich einsehbar. Dein Benutzername, sowie dein Profilbild werden ggf. Öffentlich angezeit!"} type={"INFO"} />
            <h2 className="profile-page-subheading">Kurs</h2>
            <CourseSelection selectedCourse={selectedCourse} onCourseChanged={onCourseChanged} onLinkChanged={onLinkChanged} />
            <h2 className="profile-page-subheading">Benutzername</h2>
            <h2 className="profile-page-subheading">Email</h2>
            <Info text={"Deine bissherige Login Email-Adresse wird dadurch ersetzt."} type={"INFO"} />
        </div>
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
            <h2 className="profile-page-subheading"><a className="important-text">Konto Löschen</a></h2>
            <Info text={"Die Löschung deines Kontos mit all deinen Daten ist unwiederuflich."} type={"ERROR"} />
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