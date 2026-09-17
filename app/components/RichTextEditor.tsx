import React, { useRef, useEffect, useState, useCallback } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, label, disabled }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<'visual' | 'html'>('visual');
    const [showPreview, setShowPreview] = useState(false);
    // Track the latest HTML internally to avoid stale closure issues when switching modes
    const htmlRef = useRef<string>(value);

    // Keep editor DOM in sync when value prop changes from outside (e.g. tab switch)
    useEffect(() => {
        if (mode === 'visual' && editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
        htmlRef.current = value;
    }, [value, mode]);

    // ─── Mode switching ───────────────────────────────────────────────────────

    const switchToHtml = useCallback(() => {
        // Capture the current visual content before switching
        if (editorRef.current) {
            htmlRef.current = editorRef.current.innerHTML;
            onChange(htmlRef.current);
        }
        setMode('html');
    }, [onChange]);

    const switchToVisual = useCallback((currentHtml: string) => {
        htmlRef.current = currentHtml;
        onChange(currentHtml);
        setMode('visual');
        // The useEffect above will sync the contenteditable div on next render
    }, [onChange]);

    // ─── Exec command helpers (visual mode) ──────────────────────────────────

    const execCommand = (command: string, arg?: string) => {
        if (disabled) return;
        document.execCommand(command, false, arg);
        if (editorRef.current) {
            const updated = editorRef.current.innerHTML;
            htmlRef.current = updated;
            onChange(updated);
        }
    };

    const handleVisualInput = () => {
        if (editorRef.current) {
            const updated = editorRef.current.innerHTML;
            htmlRef.current = updated;
            onChange(updated);
        }
    };

    // ─── Button styles ────────────────────────────────────────────────────────

    const toolbarBtnStyle: React.CSSProperties = {
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: '4px 6px',
        color: '#202223',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const modeTabStyle = (active: boolean): React.CSSProperties => ({
        padding: '4px 10px',
        border: '1px solid #c9cccf',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? '#6C4A79' : '#fff',
        color: active ? '#fff' : '#202223',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap' as const,
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', opacity: disabled ? 0.6 : 1 }}>
            {label && (
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#202223' }}>{label}</div>
            )}

            <div style={{ border: '1px solid #c9cccf', borderRadius: '4px', overflow: 'hidden', background: '#fff' }}>
                {/* ── Toolbar ── */}
                <div style={{
                    borderBottom: '1px solid #c9cccf',
                    padding: '6px 8px',
                    display: 'flex',
                    gap: '4px',
                    background: '#fafbfc',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                }}>
                    {/* Left side: formatting controls (visual mode only) */}
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', pointerEvents: disabled ? 'none' : 'auto' }}>
                        {mode === 'visual' && (
                            <>
                                {/* Block format selector */}
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

                                {/* Bold */}
                                <button type="button" onClick={() => execCommand('bold')} disabled={disabled} style={toolbarBtnStyle} title="Bold">
                                    <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M12.44 9.08c1.37-.62 2.16-1.89 2.16-3.33 0-2.45-2-4.25-4.85-4.25H4.25v15h5.81c3.1 0 5.19-2 5.19-4.5 0-1.83-1.02-3.23-2.81-2.92zM7.25 4.5h2.5c1.34 0 2.22.84 2.22 1.94 0 1.1-.88 1.94-2.22 1.94H7.25V4.5zm0 9.5v-4h2.8c1.55 0 2.62.9 2.62 2.06s-1.07 1.94-2.62 1.94h-2.8z" /></svg>
                                </button>
                                {/* Italic */}
                                <button type="button" onClick={() => execCommand('italic')} disabled={disabled} style={toolbarBtnStyle} title="Italic">
                                    <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M8 2h6v2h-1.63l-2.74 9H11.5v2h-6v-2h1.63l2.74-9H8V2z" /></svg>
                                </button>
                                {/* Underline */}
                                <button type="button" onClick={() => execCommand('underline')} disabled={disabled} style={toolbarBtnStyle} title="Underline">
                                    <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M10 14c3.31 0 6-2.69 6-6V3h-2.5v5c0 1.93-1.57 3.5-3.5 3.5S6.5 9.93 6.5 8V3H4v5c0 3.31 2.69 6 6 6zm-6 2h12v2H4v-2z" /></svg>
                                </button>

                                <div style={{ width: '1px', height: '20px', background: '#c9cccf', margin: '0 4px' }} />

                                {/* Bullet list */}
                                <button type="button" onClick={() => execCommand('insertUnorderedList')} disabled={disabled} style={toolbarBtnStyle} title="Bullet List">
                                    <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M6 5h12v2H6V5zm0 4h12v2H6V9zm0 4h12v2H6v-2zM3 5h2v2H3V5zm0 4h2v2H3V9zm0 4h2v2H3v-2z" /></svg>
                                </button>
                                {/* Numbered list */}
                                <button type="button" onClick={() => execCommand('insertOrderedList')} disabled={disabled} style={toolbarBtnStyle} title="Numbered List">
                                    <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M7 5h11v2H7V5zm0 4h11v2H7V9zm0 4h11v2H7v-2zM3.5 5H5v2H3.5V5zm0 4H5v2H3.5V9zm0 4H5v2H3.5v-2z" /></svg>
                                </button>

                                <div style={{ width: '1px', height: '20px', background: '#c9cccf', margin: '0 4px' }} />

                                {/* Link */}
                                <button type="button" onClick={() => {
                                    const url = prompt("Enter URL:");
                                    if (url) execCommand('createLink', url);
                                }} disabled={disabled} style={toolbarBtnStyle} title="Insert Link">
                                    <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M14.6 7.42a1.5 1.5 0 0 0-2.12-2.12l-1.42 1.41a1.5 1.5 0 0 0 2.12 2.13l.71-.71.71.71a.5.5 0 0 1 0 .71l-2.12 2.12a.5.5 0 0 1-.71 0 .5.5 0 0 1 0-.71l.71-.71-.71-.71a1.5 1.5 0 0 0-2.12 0l-2.12 2.12a1.5 1.5 0 0 0 2.12 2.12l1.42-1.41a1.5 1.5 0 0 0-2.12-2.13l-.71.71-.71-.71a.5.5 0 0 1 0-.71l2.12-2.12a.5.5 0 0 1 .71 0 .5.5 0 0 1 0 .71l-.71.71.71.71a1.5 1.5 0 0 0 2.12 0l2.12-2.12z" /></svg>
                                </button>

                                <div style={{ width: '1px', height: '20px', background: '#c9cccf', margin: '0 4px' }} />

                                {/* Undo */}
                                <button type="button" onClick={() => execCommand('undo')} disabled={disabled} style={toolbarBtnStyle} title="Undo">
                                    <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M8 14.5a.5.5 0 0 1 0 1C4.13 15.5 1 12.37 1 8.5S4.13 1.5 8 1.5A6.47 6.47 0 0 1 12.6 3.4L14.5 1.5a.5.5 0 0 1 .85.35v6a.5.5 0 0 1-.5.5h-6A.5.5 0 0 1 8.5 7.5v-.5a.5.5 0 0 1 .15-.35l1.9-1.9A5.47 5.47 0 0 0 8 2.5c-3.31 0-6 2.69-6 6s2.69 6 6 6z" /></svg>
                                </button>
                                {/* Redo */}
                                <button type="button" onClick={() => execCommand('redo')} disabled={disabled} style={toolbarBtnStyle} title="Redo">
                                    <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M12 14.5a.5.5 0 0 0 0 1c3.87 0 7-3.13 7-7s-3.13-7-7-7a6.47 6.47 0 0 0-4.6 1.9L5.5 1.5a.5.5 0 0 0-.85.35v6A.5.5 0 0 0 5.15 8.35h6a.5.5 0 0 0 .35-.85L9.6 5.6A5.47 5.47 0 0 1 12 2.5c3.31 0 6 2.69 6 6s-2.69 6-6 6z" /></svg>
                                </button>
                            </>
                        )}

                        {mode === 'html' && (
                            <span style={{ fontSize: '12px', color: '#6D7175', fontFamily: 'monospace', padding: '2px 6px' }}>
                                HTML Source Mode
                            </span>
                        )}
                    </div>

                    {/* Right side: mode toggle + preview */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto' }}>
                        {/* Preview button */}
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => setShowPreview(true)}
                            style={{
                                ...toolbarBtnStyle,
                                padding: '4px 10px',
                                border: '1px solid #c9cccf',
                                fontSize: '12px',
                                fontWeight: 600,
                                gap: '4px',
                                background: '#fff',
                                color: '#6C4A79',
                                borderColor: '#6C4A79',
                            }}
                            title="Preview email HTML"
                        >
                            <svg viewBox="0 0 20 20" style={{ width: '14px', height: '14px', fill: 'currentColor' }}>
                                <path d="M10 4C5.58 4 2 7.58 2 10s3.58 6 8 6 8-2.58 8-6-3.58-6-8-6zm0 10c-3.31 0-6-1.79-6-4s2.69-4 6-4 6 1.79 6 4-2.69 4-6 4zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                            </svg>
                            Preview
                        </button>

                        {/* Visual / HTML toggle */}
                        <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                                type="button"
                                disabled={disabled}
                                style={modeTabStyle(mode === 'visual')}
                                onClick={() => mode === 'html' ? switchToVisual(htmlRef.current) : undefined}
                                title="Switch to visual editor"
                            >
                                Visual
                            </button>
                            <button
                                type="button"
                                disabled={disabled}
                                style={modeTabStyle(mode === 'html')}
                                onClick={() => mode === 'visual' ? switchToHtml() : undefined}
                                title="Switch to HTML source editor"
                            >
                                HTML
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Editor area ── */}
                {mode === 'visual' ? (
                    <div
                        ref={editorRef}
                        contentEditable={!disabled}
                        onInput={handleVisualInput}
                        onBlur={handleVisualInput}
                        style={{
                            minHeight: '150px',
                            padding: '12px',
                            outline: 'none',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            cursor: disabled ? 'not-allowed' : 'text',
                            background: '#fff',
                        }}
                    />
                ) : (
                    <textarea
                        value={htmlRef.current}
                        disabled={disabled}
                        onChange={(e) => {
                            htmlRef.current = e.target.value;
                            onChange(e.target.value);
                        }}
                        spellCheck={false}
                        style={{
                            width: '100%',
                            minHeight: '180px',
                            padding: '12px',
                            border: 'none',
                            outline: 'none',
                            fontSize: '13px',
                            lineHeight: '1.6',
                            fontFamily: "'Fira Code', 'Cascadia Code', 'Courier New', monospace",
                            color: '#1a1a2e',
                            background: '#fafbfc',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                        }}
                    />
                )}
            </div>

            {/* ── Preview Modal ── */}
            {showPreview && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.55)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                    }}
                    onClick={() => setShowPreview(false)}
                >
                    <div
                        style={{
                            width: '100%',
                            maxWidth: '680px',
                            background: '#fff',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '90vh',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            borderBottom: '1px solid #e1e3e5',
                            background: '#fafbfc',
                        }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '15px', color: '#202223' }}>Email Preview</div>
                                <div style={{ fontSize: '12px', color: '#6D7175', marginTop: '2px' }}>This is how your email body will render for customers</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPreview(false)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', fontSize: '20px', color: '#6D7175', lineHeight: 1 }}
                                title="Close preview"
                            >
                                ×
                            </button>
                        </div>

                        {/* Simulated email client chrome */}
                        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0f0', background: '#f8f9fa', fontSize: '12px', color: '#6D7175' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '4px', lineHeight: 1.8 }}>
                                <span style={{ fontWeight: 600 }}>From:</span><span>Smart Donate &lt;donations@yourstore.com&gt;</span>
                                <span style={{ fontWeight: 600 }}>To:</span><span>customer@example.com</span>
                            </div>
                        </div>

                        {/* iframe renders the HTML in isolation, allowing images but sandboxed from scripts */}
                        <div style={{ flex: 1, overflow: 'auto', background: '#f3f4f6', padding: '16px' }}>
                            <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <iframe
                                    title="Email Preview"
                                    sandbox="allow-same-origin"
                                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#333;line-height:1.6}</style></head><body>${htmlRef.current}</body></html>`}
                                    style={{
                                        width: '100%',
                                        minHeight: '400px',
                                        border: 'none',
                                        display: 'block',
                                    }}
                                    onLoad={(e) => {
                                        // Auto-resize iframe to content height
                                        const iframe = e.currentTarget;
                                        try {
                                            const height = iframe.contentDocument?.body?.scrollHeight;
                                            if (height) iframe.style.height = height + 32 + 'px';
                                        } catch { /* cross-origin — ignore */ }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Modal footer */}
                        <div style={{ padding: '12px 20px', borderTop: '1px solid #e1e3e5', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setShowPreview(false)}
                                style={{
                                    padding: '8px 20px',
                                    background: '#6C4A79',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }}
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RichTextEditor;
