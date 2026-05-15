interface SeparatorProps {
    width: string
    height: string
}

const Separator = ({ width, height }: SeparatorProps) => {
    return <div
        style={{
            width: width,
            height: height,
            backgroundColor: 'var(--color-background-primary)'
        }}
    />
}

export default Separator;