interface SeparatorProps {
    width: string
    height: string
    variant: "primary" | "secondary"
}

const Separator = ({ width, height, variant }: SeparatorProps) => {
    return <div
        style={{
            width: width,
            height: height,
            backgroundColor: `var(--color-background-${variant})`
        }}
    />
}

export default Separator;