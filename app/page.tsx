"use client";

import { useEffect, useMemo, useState } from "react";
import PublicSite from "./public-site";

type Visibility = "Public" | "Private" | "Members";
type Attachment = { name: string; mime: string; size: number; dataUrl: string };
type Resource = {
  id: number;
  title: string;
  description: string;
  type: "File" | "Link" | "Note";
  category: string;
  visibility: Visibility;
  updated: string;
  icon: string;
  url?: string;
  attachment?: Attachment;
};

const STORAGE_KEY = "second-brain-resources";
const COLLECTIONS_KEY = "second-brain-collections";
const MAX_FILE_BYTES = 1024 * 1024;
const isResource = (value: unknown): value is Resource => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Resource>;
  return typeof item.id === "number" && typeof item.title === "string" && typeof item.description === "string" &&
    ["File", "Link", "Note"].includes(item.type || "") && typeof item.category === "string" &&
    ["Public", "Private", "Members"].includes(item.visibility || "") && typeof item.updated === "string" &&
    typeof item.icon === "string" && (!item.attachment || (typeof item.attachment.name === "string" &&
    typeof item.attachment.dataUrl === "string" && item.attachment.dataUrl.startsWith("data:") &&
    typeof item.attachment.size === "number" && item.attachment.size <= MAX_FILE_BYTES));
};

const overview = "All items";
const unfiled = "Unfiled";
const legacySamples = new Map([
  [1, ["Productivity starter kit", "A compact set of workflows, templates and daily checklists.", "Note", "Workflows", "Public", "Today", "✦"]],
  [2, ["Design resources", "Fonts, icon libraries and references for building better interfaces.", "Link", "Resources", "Public", "Yesterday", "↗"]],
  [3, ["Annual planning 2026", "Goals, review notes and personal priorities for the year.", "File", "Personal", "Private", "Sep 28", "▤"]],
  [4, ["Useful command snippets", "Small pieces of code I reach for often when shipping projects.", "Note", "Development", "Members", "Sep 24", "⌘"]],
  [5, ["Reading queue", "Articles and books worth returning to when there is more time.", "Link", "Reading", "Private", "Sep 21", "☷"]],
  [6, ["Archive / receipts", "Reference documents and records that should stay easy to find.", "File", "Archive", "Private", "Sep 18", "□"]],
]);
const htmlPreview = (attachment: Attachment) => {
  if (!/\.html?$/i.test(attachment.name)) return null;
  try {
    const encoded = attachment.dataUrl.split(",")[1];
    const binary = atob(encoded);
    return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
  } catch { return null; }
};

export default function Home() {
  if (process.env.NEXT_PUBLIC_PUBLIC_SITE === "true") return <PublicSite />;
  return <Workspace />;
}

function Workspace() {
  const [resourceList, setResourceList] = useState<Resource[]>([]);
  const [collectionList, setCollectionList] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState(overview);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<Visibility | "All">("All");
  const [showComposer, setShowComposer] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [draftType, setDraftType] = useState<Resource["type"]>("Note");
  const [draftVisibility, setDraftVisibility] = useState<Visibility>("Private");
  const [draftCategory, setDraftCategory] = useState("");
  const [draftAttachment, setDraftAttachment] = useState<Attachment | undefined>();
  const [collectionEditor, setCollectionEditor] = useState<{ mode: "create" | "rename" | "delete"; name: string; original?: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    let loadedResources: Resource[] = [];
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(isResource)) {
          loadedResources = parsed.filter((resource) => {
            const sample = legacySamples.get(resource.id);
            return !sample || ![resource.title, resource.description, resource.type, resource.category,
              resource.visibility, resource.updated, resource.icon].every((value, index) => value === sample[index]) ||
              Boolean(resource.url || resource.attachment);
          });
          setResourceList(loadedResources);
        }
        else setNotice("Saved data could not be read. Export a backup before making changes.");
      } catch { setNotice("Saved data could not be read. Export a backup before making changes."); }
    }
    const savedCollections = window.localStorage.getItem(COLLECTIONS_KEY);
    try {
      const parsed: unknown = savedCollections ? JSON.parse(savedCollections) : null;
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
        setCollectionList(parsed);
      } else {
        setCollectionList(Array.from(new Set(loadedResources.map((resource) => resource.category).filter(Boolean))));
      }
    } catch {
      setCollectionList(Array.from(new Set(loadedResources.map((resource) => resource.category).filter(Boolean))));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resourceList)); }
    catch { setNotice("Browser storage is full. Export your data and remove large files."); }
  }, [ready, resourceList]);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collectionList)); }
    catch { setNotice("Browser storage is full. Export your data and remove large files."); }
  }, [ready, collectionList]);

  const filtered = useMemo(() => resourceList.filter((resource) => {
    const matchesCategory = activeCategory === overview || (activeCategory === unfiled ? !resource.category : resource.category === activeCategory);
    const matchesVisibility = visibility === "All" || resource.visibility === visibility;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || `${resource.title} ${resource.description} ${resource.category}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesVisibility && matchesQuery;
  }), [activeCategory, query, resourceList, visibility]);

  const openCreate = () => {
    setEditingId(null);
    setDraftTitle("");
    setDraftDescription("");
    setDraftUrl("");
    setDraftType("Note");
    setDraftVisibility("Private");
    setDraftCategory(activeCategory === overview || activeCategory === unfiled ? "" : activeCategory);
    setDraftAttachment(undefined);
    setNotice("");
    setShowComposer(true);
  };

  const openEdit = (resource: Resource) => {
    setSelectedResource(null);
    setEditingId(resource.id);
    setDraftTitle(resource.title);
    setDraftDescription(resource.description);
    setDraftUrl(resource.url || "");
    setDraftType(resource.type);
    setDraftVisibility(resource.visibility);
    setDraftCategory(resource.category);
    setDraftAttachment(resource.attachment);
    setShowComposer(true);
  };

  const loadAttachment = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { setNotice("Files must be 1 MB or smaller for local browser storage."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setDraftAttachment({ name: file.name, mime: file.type || "application/octet-stream", size: file.size, dataUrl: String(reader.result) });
      setDraftType("File");
      setDraftTitle((current) => current || file.name.replace(/\.[^.]+$/, ""));
      setNotice("");
    };
    reader.onerror = () => setNotice("Could not read this file.");
    reader.readAsDataURL(file);
  };

  const createResource = () => {
    const title = draftTitle.trim();
    if (!title) return;
    const url = draftUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) { setNotice("URLs must start with http:// or https://."); return; }
    const category = draftCategory;
    const resourceData = { title, description: draftDescription.trim() || "A new resource in your local workspace.", type: draftType, category, visibility: draftVisibility, updated: "Just now", icon: draftType === "File" ? "▤" : draftType === "Link" ? "↗" : "✦", url: url || undefined, attachment: draftType === "File" ? draftAttachment : undefined };
    setResourceList((current) => editingId !== null ? current.map((resource) => resource.id === editingId ? { ...resource, ...resourceData } : resource) : [{ id: Date.now(), ...resourceData }, ...current]);
    setDraftTitle("");
    setDraftType("Note");
    setDraftVisibility("Private");
    setDraftDescription("");
    setDraftUrl("");
    setDraftAttachment(undefined);
    setShowComposer(false);
    setActiveCategory(overview);
    setVisibility("All");
  };

  const removeResource = (resource: Resource) => {
    if (!window.confirm(`Delete “${resource.title}” from this browser?`)) return;
    setResourceList((current) => current.filter((item) => item.id !== resource.id));
    setSelectedResource(null);
  };

  const addCollection = () => {
    setNotice("");
    setCollectionEditor({ mode: "create", name: "" });
  };

  const renameCollection = (oldName: string) => {
    setNotice("");
    setCollectionEditor({ mode: "rename", name: oldName, original: oldName });
  };

  const deleteCollection = (name: string) => {
    setNotice("");
    setCollectionEditor({ mode: "delete", name, original: name });
  };

  const saveCollection = () => {
    if (!collectionEditor) return;
    const { mode, original } = collectionEditor;
    const name = collectionEditor.name.trim();
    if (mode === "delete") {
      setCollectionList((current) => current.filter((item) => item !== original));
      setResourceList((current) => current.map((item) => item.category === original ? { ...item, category: "" } : item));
      if (activeCategory === original) setActiveCategory(overview);
      if (draftCategory === original) setDraftCategory("");
    } else {
      if (!name || name === overview || name === unfiled || collectionList.some((item) => item.toLowerCase() === name.toLowerCase() && item !== original)) {
        setNotice("Choose a unique collection name.");
        return;
      }
      if (mode === "create") {
        setCollectionList((current) => [...current, name]);
        setActiveCategory(name);
      } else {
        setCollectionList((current) => current.map((item) => item === original ? name : item));
        setResourceList((current) => current.map((item) => item.category === original ? { ...item, category: name } : item));
        if (activeCategory === original) setActiveCategory(name);
        if (draftCategory === original) setDraftCategory(name);
      }
    }
    setCollectionEditor(null);
    setNotice("");
  };

  const exportResources = () => {
    const blob = new Blob([JSON.stringify({ resources: resourceList, collections: collectionList }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "second-brain-resources.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  const importResources = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported: unknown = JSON.parse(String(reader.result));
        const data = Array.isArray(imported) ? { resources: imported, collections: null } : imported;
        if (!data || typeof data !== "object" || !("resources" in data)) throw new Error("Invalid format");
        const resources = data.resources;
        const collections = "collections" in data ? data.collections : null;
        if (!Array.isArray(resources) || !resources.every(isResource) ||
          (collections !== null && (!Array.isArray(collections) || !collections.every((item) => typeof item === "string")))) throw new Error("Invalid format");
        if (!window.confirm(`Replace your current ${resourceList.length} resources with ${resources.length} imported resources?`)) return;
        setResourceList(resources);
        setCollectionList(collections || Array.from(new Set(resources.map((resource: Resource) => resource.category).filter(Boolean))));
        setActiveCategory(overview);
        setNotice("Import complete. Files included in the backup are available locally.");
      } catch {
        window.alert("This file is not a valid export.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">R</span><span>Ruixing Cheng</span></div>
        <div className="sidebar-section">
          <p className="eyebrow">Workspace</p>
          <button className={`nav-item ${activeCategory === overview ? "active" : ""}`} onClick={() => setActiveCategory(overview)}><span>⌂</span> Overview <span className="nav-count">{resourceList.length}</span></button>
          <button className="nav-item"><span>★</span> Favorites <span className="nav-count">3</span></button>
          <button className="nav-item"><span>◷</span> Recent</button>
        </div>
        <div className="sidebar-section categories">
          <div className="collection-heading"><p className="eyebrow">Collections</p><button type="button" onClick={addCollection} aria-label="Add collection" title="Add collection">+</button></div>
          <button className={`nav-item ${activeCategory === unfiled ? "active" : ""}`} onClick={() => setActiveCategory(unfiled)}><span className="category-dot" />{unfiled}</button>
          {collectionList.map((category) => <div className="collection-row" key={category}><button className={`nav-item ${activeCategory === category ? "active" : ""}`} onClick={() => setActiveCategory(category)}><span className="category-dot" />{category}</button><button type="button" className="collection-action" onClick={() => renameCollection(category)} aria-label={`Rename ${category}`} title="Rename">✎</button><button type="button" className="collection-action" onClick={() => deleteCollection(category)} aria-label={`Delete ${category}`} title="Delete">×</button></div>)}
        </div>
        <div className="sidebar-footer"><div className="profile-avatar">CR</div><div><strong>My workspace</strong><span>Private account</span></div><button className="more-button" aria-label="More options">···</button></div>
      </aside>

      <section className="content">
        <header className="topbar"><div className="breadcrumb"><button type="button" onClick={() => setActiveCategory(overview)}>Overview</button>{activeCategory !== overview && <><b>/</b><strong>{activeCategory}</strong></>}</div><div className="top-actions"><button className="icon-button" aria-label="Notifications">♧</button><button className="help-button">?</button><div className="profile-avatar small">CR</div></div></header>
        <div className="page-heading"><div><p className="eyebrow">Monday, October 3, 2026</p><h1>Your workspace</h1><p className="subtitle">A calm place for the things you want to keep close.</p></div><div className="heading-actions"><button className="secondary-button" onClick={exportResources}>Export</button><label className="secondary-button import-button">Import<input type="file" accept="application/json" onChange={importResources} /></label><button className="primary-button" onClick={openCreate}><span>+</span> Add resource</button></div></div>
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notice">×</button></div>}

        <div className="stats-row"><div className="stat-card"><span>Total items</span><strong>{resourceList.length}</strong><small><em>Local</em> workspace</small></div><div className="stat-card"><span>Private items</span><strong>{resourceList.filter((item) => item.visibility === "Private").length}</strong><small>Only visible here</small></div><div className="stat-card"><span>Shared items</span><strong>{resourceList.filter((item) => item.visibility !== "Private").length}</strong><small>Ready to publish</small></div><div className="stat-card accent"><span>Storage used</span><strong>Local <small>only</small></strong><div className="progress"><span /></div><small>Browser storage</small></div></div>

        <div className="toolbar"><div className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your workspace" /><kbd>⌘ K</kbd></div><div className="filters"><select className="mobile-collection-select" value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)} aria-label="Collection"><option value={overview}>Overview</option><option value={unfiled}>{unfiled}</option>{collectionList.map((category) => <option key={category}>{category}</option>)}</select><button type="button" className="mobile-add-collection" onClick={addCollection} aria-label="Add collection">+</button><select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility | "All")} aria-label="Filter by visibility"><option value="All">All visibility</option><option value="Private">Private</option><option value="Members">Members</option><option value="Public">Public</option></select><button className="view-button active" aria-label="Grid view">▦</button><button className="view-button" aria-label="List view">☰</button></div></div>

        <div className="section-heading"><div><h2>{activeCategory}</h2><span>{filtered.length} items</span></div>{collectionList.includes(activeCategory) && <div className="collection-page-actions"><button type="button" onClick={() => renameCollection(activeCategory)}>Rename</button><button type="button" onClick={() => deleteCollection(activeCategory)}>Delete</button></div>}</div>
        <div className="resource-grid">{filtered.map((resource) => <article className="resource-card" key={resource.id} onClick={() => setSelectedResource(resource)}><div className="card-top"><div className={`resource-icon ${resource.type.toLowerCase()}`}>{resource.icon}</div><button className="card-menu" aria-label={`Open ${resource.title}`} onClick={(event) => { event.stopPropagation(); setSelectedResource(resource); }}>···</button></div><h3>{resource.title}</h3><p>{resource.description}</p><div className="card-meta"><span className={`visibility ${resource.visibility.toLowerCase()}`}><i />{resource.visibility}</span><span>{resource.updated}</span></div></article>)}</div>
        {filtered.length === 0 && <div className="empty-state"><strong>No resources found</strong><span>Try a different search or visibility filter.</span></div>}
      </section>

      {selectedResource && <div className="modal-backdrop" onClick={() => setSelectedResource(null)}><div className={`detail-modal ${selectedResource.attachment ? "with-preview" : ""}`} onClick={(event) => event.stopPropagation()}><div className="detail-icon resource-icon">{selectedResource.icon}</div><div className="detail-heading"><div><p className="eyebrow">{selectedResource.type} · {selectedResource.visibility}</p><h2>{selectedResource.title}</h2></div><button className="close-button" onClick={() => setSelectedResource(null)}>×</button></div><p className="detail-description">{selectedResource.description}</p>{selectedResource.url && <a className="resource-url" href={selectedResource.url} target="_blank" rel="noopener noreferrer">{selectedResource.url} ↗</a>}{selectedResource.attachment && <div className="attachment-detail"><div className="attachment-row"><span>{selectedResource.attachment.name} · {Math.ceil(selectedResource.attachment.size / 1024)} KB</span><a href={selectedResource.attachment.dataUrl} download={selectedResource.attachment.name}>Download</a></div>{htmlPreview(selectedResource.attachment) && <iframe title={`${selectedResource.title} preview`} sandbox="allow-scripts" srcDoc={htmlPreview(selectedResource.attachment) || ""} />}</div>}<div className="detail-meta"><span>Collection · {selectedResource.category || unfiled}</span><span>Updated {selectedResource.updated}</span></div><div className="composer-actions"><button className="danger-button" onClick={() => removeResource(selectedResource)}>Delete</button><button className="secondary-button" onClick={() => openEdit(selectedResource)}>Edit resource</button></div></div></div>}
      {showComposer && <div className="modal-backdrop" onClick={() => setShowComposer(false)}><div className="composer" onClick={(event) => event.stopPropagation()}><div className="composer-heading"><div><p className="eyebrow">{editingId ? "Edit resource" : "New resource"}</p><h2>{editingId ? "Refine this resource" : "Add to your workspace"}</h2></div><button className="close-button" onClick={() => setShowComposer(false)}>×</button></div><label>Title<input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Give this resource a name" autoFocus /></label><label>Description<textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} placeholder="What is this useful for?" rows={3} /></label><label>URL <span className="optional">optional</span><input value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} placeholder="https://" /></label><label>Type<select value={draftType} onChange={(event) => setDraftType(event.target.value as Resource["type"])}><option>Note</option><option>Link</option><option>File</option></select></label>{draftType === "File" && <label>Local file<input type="file" accept=".html,.htm,.pdf,.txt,.md,.json,image/*" onChange={(event) => loadAttachment(event.target.files?.[0])} />{draftAttachment && <span className="attached-name">{draftAttachment.name} ({Math.ceil(draftAttachment.size / 1024)} KB)</span>}</label>}<label>Collection<select value={draftCategory} onChange={(event) => setDraftCategory(event.target.value)}><option value="">{unfiled}</option>{collectionList.map((category) => <option key={category}>{category}</option>)}</select></label><label>Visibility<select value={draftVisibility} onChange={(event) => setDraftVisibility(event.target.value as Visibility)}><option>Private</option><option>Members</option><option>Public</option></select></label>{notice && <p className="form-error" role="alert">{notice}</p>}<div className="composer-actions"><button className="secondary-button" onClick={() => setShowComposer(false)}>Cancel</button><button className="primary-button" onClick={createResource}>{editingId ? "Save changes" : "Create resource"}</button></div></div></div>}
      {collectionEditor && <div className="modal-backdrop" onClick={() => setCollectionEditor(null)}><div className="composer collection-editor" role="dialog" aria-modal="true" aria-label={`${collectionEditor.mode} collection`} onClick={(event) => event.stopPropagation()}><div className="composer-heading"><h2>{collectionEditor.mode === "create" ? "New collection" : collectionEditor.mode === "rename" ? "Rename collection" : "Delete collection"}</h2><button type="button" className="close-button" onClick={() => setCollectionEditor(null)} aria-label="Close">×</button></div>{collectionEditor.mode === "delete" ? <p>Resources in “{collectionEditor.original}” will move to Unfiled.</p> : <label>Name<input autoFocus value={collectionEditor.name} onChange={(event) => setCollectionEditor({ ...collectionEditor, name: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") saveCollection(); }} maxLength={60} /></label>}{notice && <p className="form-error" role="alert">{notice}</p>}<div className="composer-actions"><button type="button" className="secondary-button" onClick={() => setCollectionEditor(null)}>Cancel</button><button type="button" className={collectionEditor.mode === "delete" ? "danger-button" : "primary-button"} onClick={saveCollection}>{collectionEditor.mode === "delete" ? "Delete collection" : "Save collection"}</button></div></div></div>}
    </main>
  );
}
