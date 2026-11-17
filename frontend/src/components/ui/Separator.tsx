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
            backgroundColor: `var(--separator-${variant}, var(--color-background-${variant}))`,
            borderRadius: "999px"
        }}
    />
}

export default Separator;