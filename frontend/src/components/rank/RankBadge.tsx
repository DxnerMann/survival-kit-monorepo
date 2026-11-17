import "@/components/rank/RankBadge.css";

type RankBadgeProps = {
    tier: string;
    color: string;
    colorSoft: string;
    size?: number;
};

const crestSrc = (tier: string) => {
    const file = tier === "PLATIN" ? "platin" : tier.toLowerCase();
    return `/images/ranks/${file}.png`;
};

const RankBadge = ({tier, color, colorSoft, size = 72}: RankBadgeProps) => {
    return (
        <span
            className="rank-badge"
            style={{
                width: size,
                height: size,
                ["--rank-color" as string]: color,
                ["--rank-color-soft" as string]: colorSoft,
            }}
        >
            <span className="rank-badge__spin" />
            <span className="rank-badge__glow" />
            <img className="rank-badge__crest" src={crestSrc(tier)} alt="" />
        </span>
    );
};

export default RankBadge;
