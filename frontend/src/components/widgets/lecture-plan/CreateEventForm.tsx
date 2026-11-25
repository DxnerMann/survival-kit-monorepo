import {useEffect, useState} from "react";
import Button from "@/components/ui/Button.tsx";
import UserInviteSelect from "@/components/ui/UserInviteSelect.tsx";
import {getErrorText} from "@/services/api.tsx";
import {createCustomEvent, listCourseUsernames} from "@/services/customEventService.tsx";
import {fetchProfileSettings, getUsername} from "@/services/userService.tsx";
import {notifyCustomEventsChanged} from "@/models/CustomEvent.tsx";

type CreateEventFormProps = {
    onCancel: () => void;
    onCreated: () => void;
};

const today = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
};

const CreateEventForm = ({onCancel, onCreated}: CreateEventFormProps) => {
    const [title, setTitle] = useState("");
    const [date, setDate] = useState(today);
    const [startTime, setStartTime] = useState("10:00");
    const [endTime, setEndTime] = useState("11:00");
    const [room, setRoom] = useState("");
    const [description, setDescription] = useState("");
    const [invites, setInvites] = useState<string[]>([]);
    const [usernames, setUsernames] = useState<string[]>([]);
    const [inviteHint, setInviteHint] = useState("Kurs wird geladen…");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const profile = await fetchProfileSettings();
                if (cancelled) {
                    return;
                }
                if (!profile.course?.trim()) {
                    setUsernames([]);
                    setInviteHint("Lege deinen Kurs im Profil fest, um Personen aus deinem Kurs einzuladen.");
                    return;
                }
                const names = await listCourseUsernames();
                if (cancelled) {
                    return;
                }
                const me = getUsername().trim().toLowerCase();
                const others = names.filter(name => name.trim().toLowerCase() !== me);
                setUsernames(others);
                setInviteHint(others.length === 0 ? "In deinem Kurs ist noch niemand sonst." : "");
            } catch (err: unknown) {
                if (!cancelled) {
                    setUsernames([]);
                    setInviteHint(getErrorText(err));
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const submit = async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            setError("Gib einen Titel ein.");
            return;
        }
        if (!date) {
            setError("Wähle einen Tag.");
            return;
        }
        if (!startTime || !endTime || endTime <= startTime) {
            setError("Das Ende muss nach dem Beginn liegen.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await createCustomEvent({
                title: trimmedTitle,
                date,
                startTime,
                endTime,
                room: room.trim(),
                description: description.trim(),
                inviteUsernames: invites,
            });
            notifyCustomEventsChanged();
            onCreated();
        } catch (err: unknown) {
            setError(getErrorText(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="settings-content">
            <div className="settings-content-wrapper lecture-plan-create">
                <p className="widget-settings-heading">Termin erstellen</p>
                <label className="lecture-plan-field">
                    <span>Titel</span>
                    <input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
                </label>
                <label className="lecture-plan-field">
                    <span>Tag</span>
                    <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </label>
                <div className="lecture-plan-times">
                    <label className="lecture-plan-field">
                        <span>Beginn</span>
                        <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                    </label>
                    <label className="lecture-plan-field">
                        <span>Ende</span>
                        <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                    </label>
                </div>
                <label className="lecture-plan-field">
                    <span>Raum</span>
                    <input value={room} maxLength={80} placeholder="optional" onChange={(event) => setRoom(event.target.value)} />
                </label>
                <label className="lecture-plan-field">
                    <span>Beschreibung</span>
                    <textarea value={description} maxLength={1000} placeholder="optional" onChange={(event) => setDescription(event.target.value)} />
                </label>
                <div className="lecture-plan-field">
                    <span>Einladen</span>
                    <UserInviteSelect
                        usernames={usernames}
                        selected={invites}
                        onChange={setInvites}
                        emptyHint={inviteHint}
                    />
                </div>
                {error && <p className="lecture-plan-form-error">{error}</p>}
            </div>
            <div className="widget-settings-buttons">
                <Button text="Zurück" onClick={onCancel} variant="secondary" type="button" fullWidth={true} disabled={saving} />
                <Button text="Erstellen" onClick={() => void submit()} variant="primary" type="button" fullWidth={true} disabled={saving} />
            </div>
        </div>
    );
};

export default CreateEventForm;
