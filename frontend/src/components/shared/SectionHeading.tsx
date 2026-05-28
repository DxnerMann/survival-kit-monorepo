import './SectionHeading.css';
import type {Action} from "../../models/Action.tsx";

interface SectionHeadingProps {
    heading: string;
    subheading?: string;
    actions?: Action[];
}

const SectionHeading = ({ heading, subheading, actions }: SectionHeadingProps) => {
    return (
        <div className={"section-heading-wrapper"}>
            <div className={"section-heading-left"}>
                <h1
                    className={"section-heading-heading"}
                    dangerouslySetInnerHTML={{ __html: heading }}
                />
                {subheading && <h4 className={"section-heading-subheading"}>{subheading}</h4>}
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