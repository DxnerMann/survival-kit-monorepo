import './SectionHeading.css';
import type {Action} from "../../models/Action.tsx";

interface SectionHeadingProps {
    heading: string;
    subheading?: string;
    centered: boolean
    actions?: Action[];
}

const SectionHeading = ({ heading, subheading, centered, actions }: SectionHeadingProps) => {
    return (
        <div
            className={"section-heading-wrapper"}
            style={{
                justifyContent: centered ? "center" : "space-between"
            }}
        >
            <div className={"section-heading-left"}>
                <h1
                    className={"section-heading-heading"}
                    dangerouslySetInnerHTML={{ __html: heading }}
                    style={{
                        textAlign: centered ? "center" : "left"
                    }}
                />
                {subheading && <h4
                    className={"section-heading-subheading"}
                    dangerouslySetInnerHTML={{ __html: subheading }}
                    style={{
                        textAlign: centered ? "center" : "left"
                    }}
                />}
            </div>

            {actions && actions.length > 0 && (
                <div className={"section-heading-actions"}>
                    {actions.map((action, index) => {
                        const Icon = action.icon;
                        return typeof action.link === "function" ? (
                            <button key={index} onClick={action.link} className="section-heading-action">
                                <Icon size={18} />
                                <span>{action.text}</span>
                            </button>
                        ) : (
                            <a key={index} href={action.link} className="section-heading-action">
                                <Icon size={18} />
                                <span>{action.text}</span>
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SectionHeading;