import { jsx as _jsx } from "react/jsx-runtime";
export default function SketchfabViewer({ modelId, className = '' }) {
    return (_jsx("div", { className: `relative w-full h-full rounded overflow-hidden ${className}`, children: _jsx("iframe", { title: "UAV 3D Model", className: "absolute top-0 left-0 w-full h-full", src: `https://sketchfab.com/models/${modelId}/embed?autostart=1&ui_controls=1&ui_infos=0&ui_inspector=0&ui_stop=0&ui_watermark=0&ui_watermark_link=0&transparent=1&theme=dark`, frameBorder: "0", allow: "autoplay; fullscreen; xr-spatial-tracking", allowFullScreen: true }) }));
}
