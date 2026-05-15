import './Button.css';

interface ButtonProps {
    text: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    fullWidth?: boolean;
}

const Button = ({
                    text,
                    onClick,
                    variant = "primary",
                    disabled = false,
                    type = "button",
                    fullWidth = false,
                }: ButtonProps) => {
    return (
        <button
            className={`btn btn--${variant}${fullWidth ? " btn--full" : ""}`}
            onClick={onClick}
            disabled={disabled}
            type={type}
        >
            {text}
        </button>
    );
};

export default Button;