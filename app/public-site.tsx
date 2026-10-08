"use client";

import { useState } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const toolUrl = `${basePath}/guitar-interval-wheel.html`;

export default function PublicSite() {
  const [expanded, setExpanded] = useState(false);

  return (
    <main className={`public-site ${expanded ? "preview-expanded" : ""}`}>
      <header className="public-header">
        <div className="public-brand"><span className="brand-mark">S</span><strong>Second Brain</strong><span className="public-divider" /><span>公开资源</span></div>
        <a href={toolUrl} target="_blank" rel="noreferrer" className="public-header-link">在新窗口打开 ↗</a>
      </header>
      <div className="public-layout">
        <aside className="public-sidebar">
          <p className="eyebrow">资源目录</p>
          <div className="public-sidebar-item"><span className="resource-icon file">▤</span><span><strong>音程转盘</strong><small>吉他 · 音乐工具</small></span></div>
        </aside>
        <section className="public-main">
          <div className="public-title-row">
            <div><p className="eyebrow">互动工具 / 吉他</p><h1>音程转盘</h1><p>旋转十二音转盘，查看音阶、和弦音及吉他指板位置。</p></div>
            <div className="public-commands"><button type="button" onClick={() => setExpanded(!expanded)}>{expanded ? "收起" : "扩大预览"}</button><a href={toolUrl} download="guitar-interval-wheel.html">下载 HTML</a></div>
          </div>
          <iframe className="public-tool" title="音程转盘 · 吉他调内音与和弦工具" src={toolUrl} sandbox="allow-scripts" />
        </section>
      </div>
    </main>
  );
}
