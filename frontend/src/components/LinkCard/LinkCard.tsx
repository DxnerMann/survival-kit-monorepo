import "./LinkCard.css"
import {useNavigate} from "react-router-dom";

type TimewasteCardProps = {
    heading: string,
    description: string,
    href: string,
    previewImagePath: string
    alingRight: boolean
}

const LinkCard = ({heading, previewImagePath, href, description, alingRight} : TimewasteCardProps) => {

    const navigate = useNavigate();

    return (
        <div className="timewaste-card" onClick={() => navigate(href)} style={{
            flexDirection: alingRight ? "row-reverse" : "row"
        }}>
            <div className={alingRight ? "timewaste-card-preview right" : "timewaste-card-preview left"}>
                {
                    <img src={previewImagePath} alt="preview" />
                }
            </div>
            <div className="timewaste-card-info">
                <h2 className="timewastecard-heading">{heading}</h2>
                <h2 className="timewastecard-description">{description}</h2>
            </div>
        </div>
    );
}

export default LinkCard;