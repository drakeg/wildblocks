export const LIBRARY_KEY = "wildblocks.worlds.v1";
const copy = value => JSON.parse(JSON.stringify(value));
export class WorldLibrary {
  constructor(storage, now = () => Date.now(), id = () => crypto.randomUUID()) {
    this.storage = storage; this.now = now; this.id = id;
    const raw = storage.getItem(LIBRARY_KEY);
    this.data = raw ? JSON.parse(raw) : { version: 1, active: null, worlds: [] };
    if (!this.data || this.data.version !== 1 || !Array.isArray(this.data.worlds) || this.data.worlds.some(w => !w || typeof w.id !== "string" || typeof w.name !== "string" || !w.save || !Number.isFinite(w.updated)) || new Set(this.data.worlds.map(w=>w.id)).size !== this.data.worlds.length || (this.data.worlds.length && !this.data.worlds.some(w=>w.id===this.data.active))) throw Error("World library could not be read. Export your saves before continuing.");
  }
  commit(next) {
    this.storage.setItem(LIBRARY_KEY, JSON.stringify(next));
    this.data = next;
  }
  list() { return this.data.worlds.map(({save,backup,...entry}) => ({...entry, mode:save.mode, seed:save.seed, hasBackup:!!backup})).sort((a,b)=>b.updated-a.updated); }
  current() { return this.data.worlds.find(w=>w.id===this.data.active); }
  load(id) { const entry=this.data.worlds.find(w=>w.id===id); if(!entry)throw Error("Choose a world first."); return copy(entry.save); }
  create(name, save) {
    const next=copy(this.data), id=this.id(), time=this.now();
    next.worlds.push({id,name:this.name(name),created:time,updated:time,save:copy(save),backup:null});
    next.active=id; this.commit(next); return id;
  }
  name(value) { const name=String(value||"").trim().slice(0,60); if(!name)throw Error("Give your world a name."); return name; }
  migrate(save) { if(!this.data.worlds.length&&save)this.create("My first world",save); }
  select(id) { this.load(id); const next=copy(this.data); next.active=id; this.commit(next); }
  save(save) {
    const next=copy(this.data), entry=next.worlds.find(w=>w.id===next.active);
    if(!entry)throw Error("Choose a world first.");
    entry.save=copy(save); entry.updated=this.now(); this.commit(next);
  }
  rename(id,name) { const next=copy(this.data),entry=next.worlds.find(w=>w.id===id); if(!entry)throw Error("Choose a world first."); entry.name=this.name(name); this.commit(next); }
  checkpoint(id = this.data.active) {
    const next=copy(this.data),entry=next.worlds.find(w=>w.id===id);
    if(!entry)return;
    next.active=id; entry.backup={time:this.now(),save:copy(entry.save)}; this.commit(next);
  }
  restore(id) {
    const next=copy(this.data),entry=next.worlds.find(w=>w.id===id);
    if(!entry?.backup)throw Error("This world has no backup yet.");
    const previous={time:entry.updated,save:entry.save}; entry.save=entry.backup.save; entry.backup=previous; entry.updated=this.now(); next.active=id; this.commit(next);
    return copy(entry.save);
  }
}
