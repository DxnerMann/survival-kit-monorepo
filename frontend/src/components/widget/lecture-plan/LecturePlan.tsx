import './LecturePlan.css';
import {dashboardService} from "../../../services/dashboardService.tsx";
import type {WidgetProps} from "../../../models/WidgetProps.tsx";
import {useState} from "react";
import {Fullscreen, Settings} from "lucide-react";
import {createPortal} from "react-dom";
import {getUserRole} from "../../../services/tokenService.tsx";

interface LecturePlanData {
    lectureColor: string,
    examColor: string,
    otherColor: string
}

const defaultData : LecturePlanData = {
    lectureColor: "#ff0000",
    examColor: "#fff300",
    otherColor: "#8e8e8e"
}

const LecturePlan = ({title, data, id, isPreview} : WidgetProps) => {

    const LOCAL_STORAGE_KEY = "lecture-plan-settings"

    const [inFullscreen, setInFullscreen] = useState(false);
    const [inSettings, setInSettings] = useState(false);
    const [decodedData, setDecodedData] = useState<LecturePlanData>(() => {
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

    const updateData = (partial: Partial<LecturePlanData>) => {
        setDecodedData(prev => ({ ...prev, ...partial }));
    };

    function saveSettings() {
        try {
            if (getUserRole() !== "GUEST") {
                dashboardService.saveWidgetData(id, JSON.stringify(decodedData));
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
            <div className="lecture-plan-widget-preview">
                <div className="lecture-plan-preview-row">
                    <div className="lecture-plan-preview-column-small"></div>
                    <div className="lecture-plan-preview-column-large"></div>
                </div>
                <div className="lecture-plan-preview-row">
                    <div className="lecture-plan-preview-column-large"></div>
                    <div className="lecture-plan-preview-column-small"></div>
                </div>
                <div className="lecture-plan-preview-row">
                    <div className="lecture-plan-preview-column-small"></div>
                    <div className="lecture-plan-preview-column-large"></div>
                </div>
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>

    }

    const getWidgetContent = () => (
        <div className={`lecture-plan-widget ${inFullscreen ? "fullscreen" : ""}`}>
            <div className="widget-header">
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

export default LecturePlan;