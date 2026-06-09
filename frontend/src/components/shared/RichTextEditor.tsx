import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Heading from "@tiptap/extension-heading";
import Placeholder from "@tiptap/extension-placeholder";
import { Mark, mergeAttributes } from "@tiptap/core";
import { useCallback } from "react";
import "./RichTextEditor.css";

const Important = Mark.create({
    name: "important",
    parseHTML() {
        return [{ tag: 'a.important-text' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ["a", mergeAttributes(HTMLAttributes, { class: "important-text" }), 0];
    },
});

interface ToolbarButtonProps {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
    return (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault();
                onClick();
            }}
            title={title}
            className={`rte-toolbar-btn${active ? " rte-toolbar-btn--active" : ""}`}
        >
            {children}
        </button>
    );
}

function Toolbar({ editor }: { editor: Editor }) {
    const setLink = useCallback(() => {
        const url = window.prompt("URL eingeben:", "https://");
        if (!url) return;
        if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
    }, [editor]);

    return (
        <div className="rte-toolbar">
            <div className="rte-toolbar-group">
                <ToolbarButton
                    onClick={() => editor.chain().focus().setHeading({ level: 3 }).run()}
                    active={editor.isActive("heading", { level: 3 })}
                    title="Überschrift"
                >
                    H1
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setHeading({ level: 4 }).run()}
                    active={editor.isActive("heading", { level: 4 })}
                    title="Unterüberschrift"
                >
                    H2
                </ToolbarButton>
            </div>

            <div className="rte-toolbar-divider" />

            <div className="rte-toolbar-group">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive("bold")}
                    title="Fett"
                >
                    <b>B</b>
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive("italic")}
                    title="Kursiv"
                >
                    <i>I</i>
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleMark("important").run()}
                    active={editor.isActive("important")}
                    title="Wichtig"
                >
                    <span className="rte-important-icon">!</span>
                </ToolbarButton>
            </div>

            <div className="rte-toolbar-divider" />

            <div className="rte-toolbar-group">
                <ToolbarButton
                    onClick={setLink}
                    active={editor.isActive("link")}
                    title="Link einfügen"
                >
                    🔗
                </ToolbarButton>
                {editor.isActive("link") && (
                    <ToolbarButton
                        onClick={() => editor.chain().focus().unsetLink().run()}
                        title="Link entfernen"
                    >
                        ✕
                    </ToolbarButton>
                )}
            </div>
        </div>
    );
}

interface RichTextEditorProps {
    value?: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = "Beschreibung eingeben…" }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                blockquote: false,
                bulletList: false,
                orderedList: false,
                listItem: false,
                code: false,
                codeBlock: false,
                horizontalRule: false,
                strike: false,
                heading: false,
            }),
            Heading.configure({ levels: [1, 2, 3, 4] }),
            Link.configure({
                openOnClick: true,
                HTMLAttributes: {
                    class: "important-text",
                    rel: "noopener noreferrer",
                    target: "_blank",
                },
                autolink: true,
            }),
            Important,
            Placeholder.configure({ placeholder }),
        ],
        content: value ?? "",
        onUpdate({ editor }) {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: "rte-content",
            },
        },
    });

    if (!editor) return null;

    return (
        <div className="form-group">
            <label>Beschreibung</label>
            <div className="rte-wrapper">
                <Toolbar editor={editor} />
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}