import "./DailyCat.css";
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import type {WidgetProps} from "../../../models/WidgetProps.tsx";
import {getDailyCat} from "../../../services/dailyEventService.tsx";
import {Fullscreen} from "lucide-react";

const DailyCat = ({title, isPreview} : WidgetProps) => {

    const [inFullscreen, setInFullscreen] = useState(false);
    const [catUrl, setCatUrl] = useState<string>();

    useEffect(() => {
        getDailyCat()
            .then(blob => {
                setCatUrl(URL.createObjectURL(blob));
            })
            .catch(console.error);
    }, []);

    if (isPreview) {
        return <>
            <div className="lecture-plan-widget-preview">
                { catUrl ? <img src={catUrl} alt="Daily cat" /> : <p>Loading...</p> }
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>
    }

    const getWidgetContent = () => (
        <div className={`daily-cat-widget ${inFullscreen ? "fullscreen" : ""}`}>
            <div className="widget-header">
                <Fullscreen
                    className="widget-header-icon"
                    size={20}
                    onClick={() => setInFullscreen(!inFullscreen)}
                />
            </div>
            <div className="daily-cat-img-wrapper">
                { catUrl ? <img className="daily-cat-img" src={catUrl} alt="Daily cat" /> : <p>Loading...</p> }
            </div>
        </div>
    );

    return inFullscreen
        ? createPortal(getWidgetContent(), document.body)
        : getWidgetContent();

}

export default DailyCat;