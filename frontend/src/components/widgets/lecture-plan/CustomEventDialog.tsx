import {useState} from "react";
import {createPortal} from "react-dom";
import Button from "@/components/ui/Button.tsx";
import type {CustomEvent} from "@/models/CustomEvent.tsx";
import {notifyCustomEventsChanged} from "@/models/CustomEvent.tsx";
import {deleteCustomEvent, respondToCustomEvent, updateCustomEvent} from "@/services/customEventService.tsx";
import {getErrorText} from "@/services/api.tsx";
import "@/components/widgets/lecture-plan/CustomEventDialog.css";

type CustomEventDialogProps = {
    event: CustomEvent;
    onClose: () => void;
};

const clock = (time: string) => time.trim().slice(0, 5);

const CustomEventDialog = ({event, onClose}: CustomEventDialogProps) => {
    const [title, setTitle] = useState(event.title);
    const [date, setDate] = useState(event.date);
    const [startTime, setStartTime] = useState(clock(event.startTime));
    const [endTime, setEndTime] = useState(clock(event.endTime));
    const [room, setRoom] = useState(event.room ?? "");
    const [description, setDescription] = useState(event.description ?? "");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const owner = event.participation === "OWNER" || event.owned;
    const declined = event.participation === "DECLINED";

    const save = async () => {
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
            await updateCustomEvent(event.id, {
                title: trimmedTitle,
                date,
                startTime,
                endTime,
                room: room.trim(),
                description: description.trim(),
                inviteUsernames: [],
            });
            notifyCustomEventsChanged();
            onClose();
        } catch (err: unknown) {
            setError(getErrorText(err));
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        setSaving(true);
        setError(null);
        try {
            await deleteCustomEvent(event.id);
            notifyCustomEventsChanged();
            onClose();
        } catch (err: unknown) {
            setError(getErrorText(err));
            setSaving(false);
        }
    };

    const answer = async (accept: boolean) => {
        setSaving(true);
        setError(null);
        try {
            await respondToCustomEvent(event.id, accept);
            notifyCustomEventsChanged();
            onClose();
        } catch (err: unknown) {
            setError(getErrorText(err));
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="custom-event-dialog" onClick={onClose}>
            <section
                className="custom-event-dialog__card"
                role="dialog"
                aria-modal="true"
                aria-label={event.title}
                onClick={(click) => click.stopPropagation()}
            >
                <div className="custom-event-dialog__header">
                    <h2>{owner ? "Termin bearbeiten" : event.title}</h2>
                    <button type="button" onClick={onClose} aria-label="Schließen">×</button>
                </div>
                {owner ? (
                    <div className="custom-event-dialog__form">
                        <label>
                            <span>Titel</span>
                            <input value={title} maxLength={120} onChange={(input) => setTitle(input.target.value)} />
                        </label>
                        <label>
                            <span>Tag</span>
                            <input type="date" value={date} onChange={(input) => setDate(input.target.value)} />
                        </label>
                        <div className="custom-event-dialog__times">
                            <label>
                                <span>Beginn</span>
                                <input type="time" value={startTime} onChange={(input) => setStartTime(input.target.value)} />
                            </label>
                            <label>
                                <span>Ende</span>
                                <input type="time" value={endTime} onChange={(input) => setEndTime(input.target.value)} />
                            </label>
                        </div>
                        <label>
                            <span>Raum</span>
                            <input value={room} maxLength={80} placeholder="optional" onChange={(input) => setRoom(input.target.value)} />
                        </label>
                        <label>
                            <span>Beschreibung</span>
                            <textarea value={description} maxLength={1000} placeholder="optional" onChange={(input) => setDescription(input.target.value)} />
                        </label>
                    </div>
                ) : (
                    <dl className="custom-event-dialog__details">
                        <div>
                            <dt>Zeit</dt>
                            <dd>{date} · {clock(event.startTime)} – {clock(event.endTime)}</dd>
                        </div>
                        {event.room && (
                            <div>
                                <dt>Raum</dt>
                                <dd>{event.room}</dd>
                            </div>
                        )}
                        {event.description && (
                            <div>
                                <dt>Beschreibung</dt>
                                <dd>{event.description}</dd>
                            </div>
                        )}
                        <p>{declined ? "Du hast abgelehnt." : "Du nimmst teil."}</p>
                    </dl>
                )}
                {error && <p className="custom-event-dialog__error">{error}</p>}
                <div className="custom-event-dialog__actions">
                    {owner ? (
                        <>
                            {confirmDelete ? (
                                <Button text="Wirklich löschen" onClick={() => void remove()} variant="secondary" type="button" fullWidth disabled={saving} />
                            ) : (
                                <Button text="Löschen" onClick={() => setConfirmDelete(true)} variant="secondary" type="button" fullWidth disabled={saving} />
                            )}
                            <Button text="Speichern" onClick={() => void save()} variant="primary" type="button" fullWidth disabled={saving} />
                        </>
                    ) : (
                        <Button
                            text={declined ? "Doch annehmen" : "Ablehnen"}
                            onClick={() => void answer(declined)}
                            variant="primary"
                            type="button"
                            fullWidth
                            disabled={saving}
                        />
                    )}
                </div>
            </section>
        </div>,
        document.body,
    );
};

export default CustomEventDialog;
