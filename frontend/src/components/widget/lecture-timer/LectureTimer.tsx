import './LectureTimer.css';
import {dashboardService} from "../../../services/dashboardService.tsx";
import type {WidgetProps} from "../../../models/WidgetProps.tsx";
import {useState} from "react";
import {Fullscreen, Settings} from "lucide-react";
import {createPortal} from "react-dom";
import {getUserRole} from "../../../services/tokenService.tsx";

interface LectureTimerData {
    strokeColor: string,
    showPercentage: boolean,
    showCountdown: boolean
}

const defaultData : LectureTimerData = {
    strokeColor: "#66d641",
    showPercentage: true,
    showCountdown: true
}

const LectureTimer = ({title, data, id, isPreview} : WidgetProps) => {

    const LOCAL_STORAGE_KEY = "lecture-timer-settings"

    const [inFullscreen, setInFullscreen] = useState(false);
    const [inSettings, setInSettings] = useState(false);
    const [decodedData, setDecodedData] = useState<LectureTimerData>(() => {
        try {
            if (getUserRole() !== "GUEST") {
                if (data === "") {
                    return defaultData;
                }
                return JSON.parse(data);
            } else {
                const cookieData = localStorage.getItem(LOCAL_STORAGE_KEY)
                if (cookieData) {
                    return JSON.parse(cookieData);
                } else   {
                    return defaultData;
                }
            }
        } catch {
            return defaultData;
        }
    });

    const updateData = (partial: Partial<LectureTimerData>) => {
        setDecodedData(prev => ({ ...prev, ...partial }));
    };

    function saveSettings() {
        try {
            if (getUserRole() !== "GUEST") {
                dashboardService.saveWidgetData(id, JSON.stringify(data));
            } else {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(decodedData));
            }
            setInSettings(false);
        } catch (e) {
            throw new Error("Error while trying to Parse data for " + title, { cause: e });
        }

    }

    if (isPreview) {
        return <>
            <div className="lecture-timer-widget-preview">

            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>

    }

    const getWidgetContent = () => (
        <div className={`lecture-timer-widget ${inFullscreen ? "fullscreen" : ""}`}>
            <div className="widget-header">
                <h2 className="widget-title">{inSettings ? "Einstellungen" : title}</h2>
                {!inSettings && <Settings
                     className="widget-header-icon"
                     size={20}
                     onClick={() => setInSettings(!inSettings)}
                />}
                <Fullscreen
                    className="widget-header-icon"
                    size={20}
                    onClick={() => setInFullscreen(!inFullscreen)}
                />
            </div>
            {
                inSettings
                    ? <div className="settings-content">
                        <button onClick={() => setInSettings(false)}>Back</button>
                        <button onClick={() => saveSettings()}>Save</button>
                    </div>
                    : <div className="widget-content">Widget Content</div>
            }
        </div>
    );

    return inFullscreen
        ? createPortal(getWidgetContent(), document.body)
        : getWidgetContent();

}

export default LectureTimer;