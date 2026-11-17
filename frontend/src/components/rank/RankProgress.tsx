import "@/components/rank/RankProgress.css";

type RankProgressProps = {
    color: string;
    colorSoft: string;
    into: number;
    span: number;
    complete?: boolean;
};

const RankProgress = ({color, colorSoft, into, span, complete = false}: RankProgressProps) => {
    const ratio = complete || span <= 0 ? 1 : Math.max(0.04, Math.min(1, into / span));
    return (
        <div
            className="rank-progress"
            style={{
                ["--rank-color" as string]: color,
                ["--rank-color-soft" as string]: colorSoft,
            }}
        >
            <span className="rank-progress__particle rank-progress__particle--a" />
            <span className="rank-progress__particle rank-progress__particle--b" />
            <span className="rank-progress__particle rank-progress__particle--c" />
            <div className="rank-progress__track">
                <div className="rank-progress__fill" style={{width: `${ratio * 100}%`}}>
                    <span className="rank-progress__knob" />
                </div>
            </div>
        </div>
    );
};

export default RankProgress;
