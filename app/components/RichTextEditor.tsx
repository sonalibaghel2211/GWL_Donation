import React, { useRef, useEffect } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, label, disabled }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    // Update editor content when value prop changes, but only if it's different
    // from current editor content to avoid cursor jumping
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    const execCommand = (command: string, arg?: string) => {
        if (disabled) return;
        document.execCommand(command, false, arg);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
            {label && (
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#202223' }}>{label}</div>
            )}
            <div style={{ border: '1px solid #c9cccf', borderRadius: '4px', overflow: 'hidden', background: '#fff' }}>
                <div style={{ borderBottom: '1px solid #c9cccf', padding: '6px 8px', display: 'flex', gap: '4px', background: '#fafbfc', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Paragraph / Heading Selector */}
                    <select
                        onChange={(e) => execCommand('formatBlock', e.target.value)}
                        defaultValue="p"
                        disabled={disabled}
                        style={{ padding: '4px', margin: '0 4px', border: '1px solid #c9cccf', borderRadius: '4px', fontSize: '13px', color: '#202223', background: '#fff', cursor: 'pointer' }}
                    >
                        <option value="p">Paragraph</option>
                        <option value="h1">Heading 1</option>
                        <option value="h2">Heading 2</option>
                        <option value="h3">Heading 3</option>
                    </select>

                    <div style={{ width: '1px', height: '20px', background: '#c9cccf', margin: '0 4px' }} />

                    {/* Formatting Buttons */}
                    <button type="button" onClick={() => execCommand('bold')} disabled={disabled} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 6px', color: '#202223', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Bold">
                        <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M12.44 9.08c1.37-.62 2.16-1.89 2.16-3.33 0-2.45-2-4.25-4.85-4.25H4.25v15h5.81c3.1 0 5.19-2 5.19-4.5 0-1.83-1.02-3.23-2.81-2.92zM7.25 4.5h2.5c1.34 0 2.22.84 2.22 1.94 0 1.1-.88 1.94-2.22 1.94H7.25V4.5zm0 9.5v-4h2.8c1.55 0 2.62.9 2.62 2.06s-1.07 1.94-2.62 1.94h-2.8z" /></svg>
                    </button>
                    <button type="button" onClick={() => execCommand('italic')} disabled={disabled} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 6px', color: '#202223', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Italic">
                        <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M8 2h6v2h-1.63l-2.74 9H11.5v2h-6v-2h1.63l2.74-9H8V2z" /></svg>
                    </button>
                    <button type="button" onClick={() => execCommand('underline')} disabled={disabled} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 6px', color: '#202223', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Underline">
                        <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M10 14c3.31 0 6-2.69 6-6V3h-2.5v5c0 1.93-1.57 3.5-3.5 3.5S6.5 9.93 6.5 8V3H4v5c0 3.31 2.69 6 6 6zm-6 2h12v2H4v-2z" /></svg>
                    </button>

                    <div style={{ width: '1px', height: '20px', background: '#c9cccf', margin: '0 4px' }} />

                    {/* List Buttons */}
                    <button type="button" onClick={() => execCommand('insertUnorderedList')} disabled={disabled} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 6px', color: '#202223', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Bullet List">
                        <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M6 5h12v2H6V5zm0 4h12v2H6V9zm0 4h12v2H6v-2zM3 5h2v2H3V5zm0 4h2v2H3V9zm0 4h2v2H3v-2z" /></svg>
                    </button>
                    <button type="button" onClick={() => execCommand('insertOrderedList')} disabled={disabled} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 6px', color: '#202223', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Numbered List">
                        <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M7 5h11v2H7V5zm0 4h11v2H7V9zm0 4h11v2H7v-2zM3.5 5H5v2H3.5V5zm0 4H5v2H3.5V9zm0 4H5v2H3.5v-2z" /></svg>
                    </button>

                    <div style={{ width: '1px', height: '20px', background: '#c9cccf', margin: '0 4px' }} />

                    {/* Media Buttons */}
                    <button type="button" onClick={() => {
                        const url = prompt("Enter URL:");
                        if (url) execCommand('createLink', url);
                    }} disabled={disabled} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 6px', color: '#202223', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Link">
                        <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M14.6 7.42a1.5 1.5 0 0 0-2.12-2.12l-1.42 1.41a1.5 1.5 0 0 0 2.12 2.13l.71-.71.71.71a.5.5 0 0 1 0 .71l-2.12 2.12a.5.5 0 0 1-.71 0 .5.5 0 0 1 0-.71l.71-.71-.71-.71a1.5 1.5 0 0 0-2.12 0l-2.12 2.12a1.5 1.5 0 0 0 2.12 2.12l1.42-1.41a1.5 1.5 0 0 0-2.12-2.13l-.71.71-.71-.71a.5.5 0 0 1 0-.71l2.12-2.12a.5.5 0 0 1 .71 0 .5.5 0 0 1 0 .71l-.71.71.71.71a1.5 1.5 0 0 0 2.12 0l2.12-2.12z" /></svg>
                    </button>

                    <div style={{ width: '1px', height: '20px', background: '#c9cccf', margin: '0 4px' }} />

                    {/* Action Buttons */}
                    <button type="button" onClick={() => execCommand('undo')} disabled={disabled} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 6px', color: '#202223', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Undo">
                        <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M8 14.5a.5.5 0 0 1 0 1C4.13 15.5 1 12.37 1 8.5S4.13 1.5 8 1.5A6.47 6.47 0 0 1 12.6 3.4L14.5 1.5a.5.5 0 0 1 .85.35v6a.5.5 0 0 1-.5.5h-6A.5.5 0 0 1 8.5 7.5v-.5a.5.5 0 0 1 .15-.35l1.9-1.9A5.47 5.47 0 0 0 8 2.5c-3.31 0-6 2.69-6 6s2.69 6 6 6z" /></svg>
                    </button>
                    <button type="button" onClick={() => execCommand('redo')} disabled={disabled} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 6px', color: '#202223', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Redo">
                        <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M12 14.5a.5.5 0 0 0 0 1c3.87 0 7-3.13 7-7s-3.13-7-7-7a6.47 6.47 0 0 0-4.6 1.9L5.5 1.5a.5.5 0 0 0-.85.35v6A.5.5 0 0 0 5.15 8.35h6a.5.5 0 0 0 .35-.85L9.6 5.6A5.47 5.47 0 0 1 12 2.5c3.31 0 6 2.69 6 6s-2.69 6-6 6z" /></svg>
                    </button>

                </div>
                <div
                    ref={editorRef}
                    contentEditable={!disabled}
                    onInput={handleInput}
                    onBlur={handleInput}
                    style={{ minHeight: '150px', padding: '12px', outline: 'none', fontSize: '14px', lineHeight: '1.5', cursor: 'text', background: '#fff' }}
                />
            </div>
        </div>
    );
};

export default RichTextEditor;
