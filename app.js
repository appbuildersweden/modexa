import {
  cloudReady,
  getSession,
  signIn,
  signUp,
  signOut,
  onAuthChange,
  pullAll,
  db as cloudDb,
  describeError,
} from "./cloud.js";
import { isDesktopApp, checkDesktopUpdate, installDesktopUpdate } from "./updater.js";

/* Modexa — agent UI shell */

/* Single source of truth for the signed-in user shown in the sidebar. */
const user = {
  /* display name stays empty until real account data is connected */
  name: "",
  handle: "jenst",
};

const icons = {
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 0 1-8 8H5l1.6-3A8 8 0 1 1 20 12Z"/><path d="M9.5 9.6 11 11l3.5-2.8"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2 2 0 0 1 5 5.5h3.6a2 2 0 0 1 1.5.7l1 1.3H19a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  github: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-4 1.2-4-2.2-5.6-2.7M15 21v-3.4a2.9 2.9 0 0 0-.8-2.2c2.6-.3 5.3-1.3 5.3-5.8a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.4 11.4 0 0 0-6 0C6.2 3.9 5.2 4.2 5.2 4.2a4.2 4.2 0 0 0-.1 3.2 4.6 4.6 0 0 0-1.3 3.2c0 4.5 2.7 5.5 5.3 5.8a2.9 2.9 0 0 0-.8 2.2V21"/></svg>`,
  terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="m7.5 9.5 2.6 2.5-2.6 2.5"/><path d="M12.8 14.5h3.7"/></svg>`,
  laptop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5.5" width="16" height="11" rx="1.8"/><path d="M2.5 19h19"/></svg>`,
  cloud: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 0 0 .3-9A6 6 0 0 0 6.2 11 3.5 3.5 0 0 0 6.5 19Z"/></svg>`,
  check: `<svg class="menu-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>`,
};

let uid = 0;
const nextId = (prefix) => `${prefix}-${(uid += 1)}`;

const state = {
  collapsed: false,
  view: "chat",
  scope: { type: "chat" },
  location: "local",
  projectSettings: { open: false, id: null },
  skills: [],
  savedSkills: [],
  mcp: [],
  models: [],
  modelPicker: { speed: 1, quality: 1, showLess: false, usedHours: 0, budgetHours: 21, selectedId: null },
  appearance: { preset: "dark", style: "3d", filter: "all" },
  activeChatId: null,
  expandedProjectId: null,
  projects: [],
  chats: [],
};

const el = {
  app: document.getElementById("app"),
  sidebar: document.getElementById("sidebar"),
  settingsSidebar: document.getElementById("settingsSidebar"),
  settingsTitle: document.getElementById("settingsTitle"),
  projectList: document.getElementById("projectList"),
  chatList: document.getElementById("chatList"),
  welcome: document.getElementById("welcome"),
  thread: document.getElementById("thread"),
  scroll: document.getElementById("scroll"),
  input: document.getElementById("input"),
  sendBtn: document.getElementById("sendBtn"),
  newChatBtn: document.getElementById("newChatBtn"),
  newProjectBtn: document.getElementById("newProjectBtn"),
  scopePill: document.getElementById("scopePill"),
  scopeIco: document.getElementById("scopeIco"),
  scopeLabel: document.getElementById("scopeLabel"),
  locationPill: document.getElementById("locationPill"),
  locationIco: document.getElementById("locationIco"),
  locationLabel: document.getElementById("locationLabel"),
  menu: document.getElementById("menu"),
  modelPill: document.getElementById("modelPill"),
  modelPillLabel: document.getElementById("modelPillLabel"),
  usageLeft: document.getElementById("usageLeft"),
  modelMenu: document.getElementById("modelMenu"),
  mmSpeedLabels: document.getElementById("mmSpeedLabels"),
  mmSpeedGauge: document.getElementById("mmSpeedGauge"),
  mmQualityLabels: document.getElementById("mmQualityLabels"),
  mmQualityGauge: document.getElementById("mmQualityGauge"),
  mmLess: document.getElementById("mmLess"),
  mmLessLabel: document.getElementById("mmLessLabel"),
  mmBody: document.getElementById("mmBody"),
  mmList: document.getElementById("mmList"),
  mmUsed: document.getElementById("mmUsed"),
  mmBarFill: document.getElementById("mmBarFill"),
  mmLeft: document.getElementById("mmLeft"),
  collapseBtn: document.getElementById("collapseBtn"),
  expandBtn: document.getElementById("expandBtn"),
  homeBtn: document.getElementById("homeBtn"),
  settingsRailBtn: document.getElementById("settingsRailBtn"),
  profileBtn: document.getElementById("profileBtn"),
  settingsView: document.getElementById("settingsView"),
  settingsNav: document.getElementById("settingsNav"),
  accountPanel: document.getElementById("accountPanel"),
  generalPanel: document.getElementById("generalPanel"),
  composerWrap: document.getElementById("composerWrap"),
  projectSettingsBtn: document.getElementById("projectSettingsBtn"),
  projectSublist: document.getElementById("projectSublist"),
  appearancePanel: document.getElementById("appearancePanel"),
  themePreview: document.getElementById("themePreview"),
  themeName: document.getElementById("themeName"),
  themeSwatches: document.getElementById("themeSwatches"),
  presetGrid: document.getElementById("presetGrid"),
  styleSegmented: document.getElementById("styleSegmented"),
  presetFilter: document.getElementById("presetFilter"),
  skillsPanel: document.getElementById("skillsPanel"),
  mcpPanel: document.getElementById("mcpPanel"),
  mcpListView: document.getElementById("mcpListView"),
  mcpAddView: document.getElementById("mcpAddView"),
  mcpServers: document.getElementById("mcpServers"),
  mcpAddBtn: document.getElementById("mcpAddBtn"),
  mcpRefreshBtn: document.getElementById("mcpRefreshBtn"),
  mcpBackBtn: document.getElementById("mcpBackBtn"),
  mcpJson: document.getElementById("mcpJson"),
  mcpName: document.getElementById("mcpName"),
  mcpError: document.getElementById("mcpError"),
  mcpCreateBtn: document.getElementById("mcpCreateBtn"),
  mcpCancelBtn: document.getElementById("mcpCancelBtn"),
  updatesPanel: document.getElementById("updatesPanel"),
  updatesVersion: document.getElementById("updatesVersion"),
  updatesStatus: document.getElementById("updatesStatus"),
  checkUpdatesBtn: document.getElementById("checkUpdatesBtn"),
  installUpdateBtn: document.getElementById("installUpdateBtn"),
  cloudStatus: document.getElementById("cloudStatus"),
  cloudForm: document.getElementById("cloudForm"),
  cloudEmail: document.getElementById("cloudEmail"),
  cloudPassword: document.getElementById("cloudPassword"),
  cloudSignInBtn: document.getElementById("cloudSignInBtn"),
  cloudSignUpBtn: document.getElementById("cloudSignUpBtn"),
  cloudSession: document.getElementById("cloudSession"),
  cloudEmailLabel: document.getElementById("cloudEmailLabel"),
  cloudSignOutBtn: document.getElementById("cloudSignOutBtn"),
  cloudError: document.getElementById("cloudError"),
  skillsSearch: document.getElementById("skillsSearch"),
  createSkillBtn: document.getElementById("createSkillBtn"),
  skillList: document.getElementById("skillList"),
  saveSkillsBtn: document.getElementById("saveSkillsBtn"),
  resetSkillsBtn: document.getElementById("resetSkillsBtn"),
  projectPanel: document.getElementById("projectPanel"),
  projectPath: document.getElementById("projectPath"),
  startupScript: document.getElementById("startupScript"),
  saveProjectBtn: document.getElementById("saveProjectBtn"),
  resetProjectBtn: document.getElementById("resetProjectBtn"),
  projectModal: document.getElementById("projectModal"),
  projectName: document.getElementById("projectName"),
  createProjectBtn: document.getElementById("createProjectBtn"),
  folderLabel: document.getElementById("folderLabel"),
  repoLabel: document.getElementById("repoLabel"),
  chooseFolderBtn: document.getElementById("chooseFolderBtn"),
  chooseRepoBtn: document.getElementById("chooseRepoBtn"),
  closeProjectBtn: document.getElementById("closeProjectBtn"),
  cancelProjectBtn: document.getElementById("cancelProjectBtn"),
};

/* ---------------- identity ---------------- */
function renderUser() {
  const initial = user.handle.charAt(0).toUpperCase();
  el.profileBtn.textContent = initial;
}

/* ---------------- sidebar ---------------- */
function renderProjects() {
  el.projectList.innerHTML = "";
  for (const project of state.projects) {
    const wrap = document.createElement("div");
    wrap.className = "project";

    const row = document.createElement("button");
    row.className = "row project-row";
    row.innerHTML = `<span class="ico">${icons.folder}</span><span class="label">${escapeHtml(project.name)}</span>`;
    row.addEventListener("click", () => {
      state.expandedProjectId = state.expandedProjectId === project.id ? null : project.id;
      renderProjects();
    });
    wrap.appendChild(row);

    if (state.expandedProjectId === project.id) {
      const sub = document.createElement("button");
      sub.className = "row sub-row";
      if (!state.activeChatId) sub.classList.add("active");
      sub.innerHTML = `<span class="ico">${icons.chat}</span><span class="label">New chat</span>`;
      sub.addEventListener("click", () => startChat(project.id));
      wrap.appendChild(sub);
    }
    el.projectList.appendChild(wrap);
  }
}

function renderChats() {
  el.chatList.innerHTML = "";
  for (const chat of state.chats) {
    const row = document.createElement("button");
    row.className = "row chat-row" + (chat.id === state.activeChatId ? " active" : "");
    row.title = chat.title;
    row.innerHTML = `<span class="ico">${icons.chat}</span><span class="label">${escapeHtml(chat.title)}</span>`;
    row.addEventListener("click", () => openChat(chat.id));
    el.chatList.appendChild(row);
  }
}

/* ---------------- main ---------------- */
function renderMain() {
  const isSettings = state.view === "settings";
  const chat = state.chats.find((c) => c.id === state.activeChatId);
  const hasThread = !isSettings && Boolean(chat && chat.messages.length);

  el.settingsView.hidden = !isSettings;
  el.settingsSidebar.hidden = !isSettings;
  el.sidebar.hidden = isSettings;
  el.composerWrap.hidden = isSettings;
  el.homeBtn.classList.toggle("active", !isSettings);
  el.settingsRailBtn.classList.toggle("active", isSettings);
  el.profileBtn.classList.toggle("active", isSettings);

  el.app.classList.toggle("settings-open", isSettings);
  el.app.classList.toggle("empty", !isSettings && !hasThread);
  el.welcome.hidden = isSettings || hasThread;
  el.thread.hidden = !hasThread;
  if (isSettings) syncSettingsPanel();
  el.thread.innerHTML = "";
  if (!hasThread) return;

  for (const msg of chat.messages) {
    const node = document.createElement("div");
    node.className = `msg ${msg.role}`;
    if (msg.role === "user") {
      node.innerHTML = `<div class="body"></div>`;
      node.querySelector(".body").textContent = msg.text;
    } else {
      node.innerHTML = `<div class="avatar"><img src="/logo/modexa-logo.png" alt="" /></div>
        <div class="body"><span class="who">Modexa</span><span class="text"></span></div>`;
      node.querySelector(".text").textContent = msg.text;
    }
    el.thread.appendChild(node);
  }
  el.scroll.scrollTop = el.scroll.scrollHeight;
}

/* ---------------- actions ---------------- */
function startChat(projectId = null) {
  state.view = "chat";
  const id = nextId("c");
  const chat = { id, title: "New chat", projectId, messages: [] };
  state.chats.unshift(chat);
  state.activeChatId = id;
  state.expandedProjectId = projectId || state.expandedProjectId;
  renderProjects();
  renderChats();
  renderMain();
  el.input.focus();
  cloudWrite("chat", async (userId) => {
    const row = await cloudDb.createChat(userId, chat);
    chat.id = row.id;
    state.activeChatId = row.id;
  });
}

function openChat(id) {
  state.view = "chat";
  state.activeChatId = id;
  renderChats();
  renderMain();
  el.input.focus();
}

function send(text) {
  const value = text.trim();
  if (!value) return;
  if (selectedModel() && remainingHours() <= 0) return;

  let chat = state.chats.find((c) => c.id === state.activeChatId);
  if (!chat) {
    startChat();
    chat = state.chats.find((c) => c.id === state.activeChatId);
  }
  if (chat.title === "New chat") {
    chat.title = value.length > 38 ? `${value.slice(0, 38)}…` : value;
  }
  chat.messages.push({ role: "user", text: value });
  cloudWrite("message", async (userId) => {
    if (!chat.remoteId) return;
    await cloudDb.addMessage(userId, chat.remoteId, { role: "user", text: value });
  });

  el.input.value = "";
  autosize();
  updateSendState();
  renderChats();
  renderMain();

  startUsage();

  /* placeholder until the agent backend is wired up */
  window.setTimeout(() => {
    const reply = "The interface is ready — the agent backend isn't connected yet. Once you add the model and tools, replies will stream in here.";
    chat.messages.push({ role: "agent", text: reply });
    cloudWrite("message", async (userId) => {
      if (!chat.remoteId) return;
      await cloudDb.addMessage(userId, chat.remoteId, { role: "agent", text: reply });
    });
    renderMain();
    stopUsage();
  }, 550);
}

/* ---------------- composer ---------------- */
function autosize() {
  el.input.style.height = "auto";
  el.input.style.height = `${el.input.scrollHeight}px`;
}

function updateSendState() {
  const blocked = Boolean(selectedModel()) && remainingHours() <= 0;
  el.sendBtn.disabled = blocked || el.input.value.trim().length === 0;
  el.sendBtn.title = blocked ? "Daily usage time is used up" : "Send";
}

el.input.addEventListener("input", () => {
  autosize();
  updateSendState();
});
el.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    send(el.input.value);
  }
});
el.sendBtn.addEventListener("click", () => send(el.input.value));

el.newChatBtn.addEventListener("click", () => startChat());
el.newProjectBtn.addEventListener("click", openProjectModal);

/* ---------------- navigation ---------------- */
function setView(view) {
  state.view = view;
  renderMain();
}

el.homeBtn.addEventListener("click", () => setView("chat"));
el.settingsRailBtn.addEventListener("click", () => setView("settings"));
el.profileBtn.addEventListener("click", () => setView("settings"));

el.settingsNav.addEventListener("click", (event) => {
  const sub = event.target.closest(".settings-subitem");
  if (sub) {
    for (const row of el.settingsNav.querySelectorAll(".settings-item")) row.classList.remove("active");
    selectProjectSettings(sub.dataset.kind === "chats" ? "chats" : sub.dataset.id);
    return;
  }

  const item = event.target.closest(".settings-item");
  if (!item) return;

  if (item === el.projectSettingsBtn) {
    state.projectSettings.open = !state.projectSettings.open;
    for (const row of el.settingsNav.querySelectorAll(".settings-item")) row.classList.remove("active");
    if (!state.projectSettings.open) {
      state.projectSettings.id = null;
      el.settingsTitle.textContent = "Project settings";
      renderProjectSublist();
      syncSettingsPanel();
      return;
    }
    renderProjectSublist();
    const first = state.projects[0] ? state.projects[0].id : "chats";
    selectProjectSettings(first);
    return;
  }

  state.projectSettings.id = null;
  renderProjectSublist();
  for (const row of el.settingsNav.querySelectorAll(".settings-item")) row.classList.toggle("active", row === item);
  const label = [...item.childNodes].find((node) => node.nodeType === 3);
  el.settingsTitle.textContent = (label ? label.textContent : item.textContent).trim();
  syncSettingsPanel();
});

/* ---------------- project settings ---------------- */
function projectFolderPath(project) {
  if (project.folder && /[\\/]/.test(project.folder)) return project.folder;
  return `C:\\Users\\${user.handle}\\OneDrive\\Desktop\\${project.folder || project.name}`;
}

function renderProjectSublist() {
  el.projectSettingsBtn.classList.toggle("open", state.projectSettings.open);
  el.projectSublist.hidden = !state.projectSettings.open;
  if (!state.projectSettings.open) {
    el.projectSublist.innerHTML = "";
    return;
  }

  el.projectSublist.innerHTML = "";

  const chats = document.createElement("button");
  chats.className = "settings-subitem" + (state.projectSettings.id === "chats" ? " active" : "");
  chats.dataset.kind = "chats";
  chats.innerHTML = `${icons.folder}<span>Chats</span>`;
  el.projectSublist.appendChild(chats);

  for (const project of state.projects) {
    const row = document.createElement("button");
    row.className = "settings-subitem" + (state.projectSettings.id === project.id ? " active" : "");
    row.dataset.kind = "project";
    row.dataset.id = project.id;
    row.innerHTML = `${icons.folder}<span>${escapeHtml(project.name)}</span>`;
    el.projectSublist.appendChild(row);
  }
}

function selectProjectSettings(id) {
  state.projectSettings.id = id;
  renderProjectSublist();

  if (id === "chats") {
    el.settingsTitle.textContent = "Chats";
    syncSettingsPanel();
    return;
  }

  const project = state.projects.find((p) => p.id === id);
  if (!project) return;
  el.settingsTitle.textContent = project.name;
  el.projectPath.textContent = projectFolderPath(project);
  el.startupScript.value = project.startup ?? "bun install";
  syncSettingsPanel();
}

el.saveProjectBtn.addEventListener("click", () => {
  const project = state.projects.find((p) => p.id === state.projectSettings.id);
  if (!project) return;
  project.startup = el.startupScript.value;
  cloudWrite("project", async (userId) => {
    await cloudDb.updateProject(project.id, { name: project.name, startup: project.startup });
  });
});

el.resetProjectBtn.addEventListener("click", () => {
  const project = state.projects.find((p) => p.id === state.projectSettings.id);
  if (!project) return;
  project.startup = "bun install";
  el.startupScript.value = "bun install";
});

el.settingsView.addEventListener("click", (event) => {
  const segment = event.target.closest(".segment");
  if (!segment) return;
  for (const button of el.settingsView.querySelectorAll(".segment")) {
    button.classList.toggle("active", button === segment);
  }
});

function syncSettingsPanel() {
  const active = el.settingsNav.querySelector(".settings-item.active");
  const label = active ? active.textContent.trim() : "";
  const inProject = Boolean(state.projectSettings.id) && !active && state.projectSettings.open;
  el.accountPanel.hidden = label !== "Account";
  el.generalPanel.hidden = label !== "General";
  el.projectPanel.hidden = !inProject;
  el.skillsPanel.hidden = label !== "Skills";
  el.appearancePanel.hidden = label !== "Appearance";
  el.mcpPanel.hidden = label !== "MCP";
  if (label !== "MCP") closeMcpAdd();
  if (label === "Updates" && el.updatesPanel.hidden) checkForUpdates();
  el.updatesPanel.hidden = label !== "Updates";
  el.settingsView.classList.toggle("project-mode", inProject);
}

/* ---------------- mcp ---------------- */
const MCP_KEY = "modexa-mcp";
const MCP_EXAMPLE = `{
  "mcpServers": {
    "my-server": { "url": "https://example.com/mcp" }
  }
}`;

function loadMcp() {
  try {
    const saved = JSON.parse(localStorage.getItem(MCP_KEY) || "[]");
    if (Array.isArray(saved)) {
      state.mcp = saved.filter((server) => server && typeof server.name === "string");
    }
  } catch (error) {
    /* ignore unreadable storage */
  }
}

function saveMcp() {
  try {
    localStorage.setItem(MCP_KEY, JSON.stringify(state.mcp));
  } catch (error) {
    /* storage can be blocked - the servers stay for this session */
  }
}

function renderMcp() {
  el.mcpServers.innerHTML = "";

  if (!state.mcp.length) {
    const empty = document.createElement("p");
    empty.className = "mcp-empty";
    empty.textContent = "No MCP servers yet.";
    el.mcpServers.appendChild(empty);
    return;
  }

  state.mcp.forEach((server, index) => {
    const row = document.createElement("div");
    row.className = "mcp-server";
    row.innerHTML = `<span class="mcp-ico">${icons.terminal}</span>
      <div class="mcp-meta"><p class="mcp-title"></p><p class="mcp-status"></p></div>`;
    row.querySelector(".mcp-title").textContent = server.name;

    const ready = server.status === "ready";
    const status = row.querySelector(".mcp-status");
    status.textContent = ready ? "Ready when needed" : "Needs approval";
    status.classList.toggle("warn", !ready);

    if (ready) {
      const chevron = document.createElement("span");
      chevron.className = "mcp-chevron";
      chevron.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>`;
      row.appendChild(chevron);
    } else {
      const review = document.createElement("button");
      review.className = "card-btn light";
      review.textContent = "Review";
      review.addEventListener("click", () => {
        state.mcp[index].status = "ready";
        saveMcp();
        renderMcp();
      });
      row.appendChild(review);
    }

    el.mcpServers.appendChild(row);
  });
}

function openMcpAdd() {
  el.mcpListView.hidden = true;
  el.mcpAddView.hidden = false;
  el.mcpJson.value = MCP_EXAMPLE;
  el.mcpName.value = "";
  el.mcpError.hidden = true;
  el.mcpJson.focus();
}

function closeMcpAdd() {
  el.mcpAddView.hidden = true;
  el.mcpListView.hidden = false;
  el.mcpError.hidden = true;
}

function addMcpServer() {
  const raw = el.mcpJson.value.trim();
  const fallbackName = el.mcpName.value.trim();
  const added = [];

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const servers = parsed && typeof parsed === "object" ? parsed.mcpServers : null;
      if (servers && typeof servers === "object") {
        for (const [name, config] of Object.entries(servers)) {
          if (!state.mcp.some((server) => server.name.toLowerCase() === name.toLowerCase())) {
            state.mcp.push({ name, config, status: "needs-approval" });
            added.push(name);
          }
        }
      }
    } catch (error) {
      /* invalid JSON is reported below */
    }
  }

  if (!added.length && fallbackName) {
    if (!state.mcp.some((server) => server.name.toLowerCase() === fallbackName.toLowerCase())) {
      state.mcp.push({ name: fallbackName, config: raw || null, status: "needs-approval" });
      added.push(fallbackName);
    }
  }

  if (!added.length) {
    el.mcpError.hidden = false;
    el.mcpJson.focus();
    return;
  }

  saveMcp();
  renderMcp();
  closeMcpAdd();
  cloudWrite("mcp", async (userId) => {
    for (const name of added) {
      const server = state.mcp.find((item) => item.name === name);
      if (server) await cloudDb.addMcpServer(userId, server);
    }
  });
}

el.mcpAddBtn.addEventListener("click", openMcpAdd);
el.mcpCancelBtn.addEventListener("click", closeMcpAdd);
el.mcpBackBtn.addEventListener("click", closeMcpAdd);
el.mcpCreateBtn.addEventListener("click", addMcpServer);
el.mcpRefreshBtn.addEventListener("click", renderMcp);

/* ---------------- cloud (Supabase) ---------------- */
const cloud = { session: null };

function setCloudError(message) {
  const text = (message || "").trim();
  el.cloudError.hidden = !text;
  el.cloudError.textContent = text;
}

function cloudWrite(label, task) {
  if (!cloud.session) return;
  task(cloud.session.user.id).catch((error) => {
    setCloudError(`${label}: ${describeError(error)}`);
  });
}

function renderCloud() {
  if (!cloudReady) {
    el.cloudStatus.textContent = "Supabase is not configured in .env";
    el.cloudForm.hidden = true;
    el.cloudSession.hidden = true;
    return;
  }

  const signedIn = Boolean(cloud.session);
  el.cloudForm.hidden = signedIn;
  el.cloudSession.hidden = !signedIn;
  el.cloudStatus.textContent = signedIn ? "Connected to Supabase" : "Not signed in";
  el.cloudEmailLabel.textContent = signedIn ? cloud.session.user.email ?? "" : "";
}

function hydrateFromCloud(data) {
  state.projects = data.projects.map((row) => ({
    id: row.id,
    name: row.name,
    folder: row.folder,
    repo: row.repo,
    startup: row.startup_script || "bun install",
  }));

  state.chats = data.chats.map((row) => ({
    id: row.id,
    remoteId: row.id,
    title: row.title,
    projectId: row.project_id,
    scope: row.scope,
    location: row.location,
    messages: [],
  }));

  for (const row of data.messages) {
    const chat = state.chats.find((item) => item.id === row.chat_id);
    if (chat) chat.messages.push({ role: row.role, text: row.body, model: row.model });
  }

  state.skills = data.skills.map((row) => ({
    name: row.name,
    description: row.description,
    instructions: row.instructions,
  }));
  state.savedSkills = JSON.parse(JSON.stringify(state.skills));
  state.mcp = data.mcp.map((row) => ({ name: row.name, config: row.config, status: row.status }));

  if (data.usage) state.modelPicker.usedHours = Number(data.usage.used_hours) || 0;

  state.activeChatId = state.chats[0] ? state.chats[0].id : null;
  state.expandedProjectId = null;
  state.scope = { type: "chat" };

  renderProjects();
  renderProjectSublist();
  renderSkills();
  renderMcp();
  renderChats();
  renderModePills();
  renderModelMenu();
  renderMain();
}

async function syncFromCloud() {
  if (!cloud.session) return;
  try {
    hydrateFromCloud(await pullAll());
    setCloudError("");
  } catch (error) {
    setCloudError(describeError(error));
  }
}

async function handleSignIn(event) {
  event.preventDefault();
  if (!cloudReady) return;
  const email = el.cloudEmail.value.trim();
  const password = el.cloudPassword.value;
  if (!email || !password) {
    setCloudError("Enter email and password.");
    return;
  }

  setCloudError("");
  el.cloudStatus.textContent = "Signing in…";
  try {
    cloud.session = await signIn(email, password);
    el.cloudPassword.value = "";
    renderCloud();
    await syncFromCloud();
  } catch (error) {
    setCloudError(describeError(error));
    renderCloud();
  }
}

async function handleSignUp() {
  if (!cloudReady) return;
  const email = el.cloudEmail.value.trim();
  const password = el.cloudPassword.value;
  if (!email || !password) {
    setCloudError("Enter email and password.");
    return;
  }

  setCloudError("");
  el.cloudStatus.textContent = "Creating account…";
  try {
    cloud.session = await signUp(email, password);
    el.cloudPassword.value = "";
    renderCloud();
    if (cloud.session) {
      await syncFromCloud();
    } else {
      el.cloudStatus.textContent = "Check your inbox to confirm the account";
    }
  } catch (error) {
    setCloudError(describeError(error));
    renderCloud();
  }
}

async function initCloud() {
  renderCloud();
  if (!cloudReady) return;

  try {
    cloud.session = await getSession();
    if (cloud.session) await syncFromCloud();
  } catch (error) {
    setCloudError(describeError(error));
  }
  renderCloud();

  onAuthChange(async (session) => {
    const hadSession = Boolean(cloud.session);
    cloud.session = session;
    renderCloud();
    if (session && !hadSession) await syncFromCloud();
  });
}

el.cloudForm.addEventListener("submit", handleSignIn);
el.cloudSignUpBtn.addEventListener("click", handleSignUp);
el.cloudSignOutBtn.addEventListener("click", async () => {
  try {
    await signOut();
    cloud.session = null;
    setCloudError("");
    renderCloud();
  } catch (error) {
    setCloudError(describeError(error));
  }
});

/* ---------------- updates ---------------- */
const APP_VERSION = document.querySelector('meta[name="modexa-version"]')?.content || "0.1.0";
let checkingUpdates = false;

function showUpdateStatus(text, available = false) {
  el.updatesStatus.textContent = text;
  el.updatesStatus.classList.toggle("available", available);
}

async function checkForUpdates() {
  if (checkingUpdates) return;
  checkingUpdates = true;
  showUpdateStatus("Checking for updates…");
  el.installUpdateBtn.hidden = true;

  try {
    if (isDesktopApp()) {
      const result = await checkDesktopUpdate();
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (result.status === "available") {
        el.installUpdateBtn.hidden = false;
        showUpdateStatus(`Version ${result.version} is available — install to update`, true);
      } else if (result.status === "current") {
        showUpdateStatus(`Up to date · checked ${time}`);
      } else {
        showUpdateStatus(`Couldn't check for updates${result.error ? `: ${result.error}` : ""}`);
      }
      return;
    }

    const response = await fetch(window.location.href, { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    const html = await response.text();
    const match = html.match(/<meta name="modexa-version" content="([^"]+)"/);
    const latest = match ? match[1] : APP_VERSION;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (latest !== APP_VERSION) {
      showUpdateStatus(`Version ${latest} is available — reload to update`, true);
    } else {
      showUpdateStatus(`Up to date · checked ${time}`);
    }
  } catch (error) {
    showUpdateStatus("Couldn't check for updates");
  } finally {
    checkingUpdates = false;
  }
}

el.updatesVersion.textContent = `Modexa ${APP_VERSION}`;
el.checkUpdatesBtn.addEventListener("click", checkForUpdates);
el.installUpdateBtn.addEventListener("click", async () => {
  el.installUpdateBtn.disabled = true;
  showUpdateStatus("Downloading update…");
  try {
    await installDesktopUpdate();
  } catch (error) {
    el.installUpdateBtn.disabled = false;
    showUpdateStatus(`Update failed: ${error && error.message ? error.message : error}`);
  }
});

/* ---------------- appearance ---------------- */
const themes = {
  auto: { name: "Auto", variant: "dark", swatches: ["#151615", "#b5cea5", "#f4f5f3"], tone: "light" },
  dark: { name: "Dark", variant: "dark", swatches: ["#151615", "#b5cea5", "#f4f5f3"], tone: "dark" },
  light: { name: "Light", variant: "light", swatches: ["#f4f5f3", "#b5cea5", "#1c1d1c"], tone: "light" },
  shine: { name: "OG Shine", variant: "shine", swatches: ["#0b0b0b", "#2fd4c4", "#f4f5f3"], tone: "dark" },
};

const prefersLight = window.matchMedia("(prefers-color-scheme: light)");

const THEME_KEY = "modexa-theme";

function applyTheme() {
  const preset = state.appearance.preset;
  const resolved = preset === "auto" ? (prefersLight.matches ? "light" : "dark") : preset;
  document.documentElement.dataset.theme = resolved;
  try {
    localStorage.setItem(THEME_KEY, preset);
  } catch (error) {
    /* storage can be blocked - the theme still applies for this session */
  }
}

(function restoreTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && themes[saved]) state.appearance.preset = saved;
  } catch (error) {
    /* ignore unreadable storage */
  }
})();

prefersLight.addEventListener("change", () => {
  if (state.appearance.preset === "auto") applyTheme();
});

function applyAppearance() {
  const theme = themes[state.appearance.preset];

  applyTheme();
  el.themePreview.className = `preview hero ${theme.variant}`;
  el.themeName.textContent = theme.name;
  el.themeSwatches.innerHTML = theme.swatches
    .map((color) => `<span style="background:${color}"></span>`)
    .join("");

  for (const card of el.presetGrid.querySelectorAll(".preset")) {
    const key = card.dataset.preset;
    card.classList.toggle("selected", key === state.appearance.preset);
    const hiddenByFilter =
      state.appearance.filter === "dark" ? themes[key].tone !== "dark" : state.appearance.filter === "light" ? themes[key].tone !== "light" : false;
    card.hidden = hiddenByFilter;
  }

  for (const button of el.styleSegmented.querySelectorAll(".segment")) {
    button.classList.toggle("active", button.dataset.style === state.appearance.style);
  }
  for (const button of el.presetFilter.querySelectorAll(".segment")) {
    button.classList.toggle("active", button.dataset.filter === state.appearance.filter);
  }
}

el.presetGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".preset");
  if (!card) return;
  state.appearance.preset = card.dataset.preset;
  applyAppearance();
});

el.styleSegmented.addEventListener("click", (event) => {
  const button = event.target.closest(".segment");
  if (!button) return;
  state.appearance.style = button.dataset.style;
  applyAppearance();
});

el.presetFilter.addEventListener("click", (event) => {
  const button = event.target.closest(".segment");
  if (!button) return;
  state.appearance.filter = button.dataset.filter;
  applyAppearance();
});

/* ---------------- skills ---------------- */
function renderSkills() {
  el.skillList.innerHTML = "";

  if (!state.skills.length) {
    const empty = document.createElement("p");
    empty.className = "skills-empty";
    empty.textContent = "No skills yet.";
    el.skillList.appendChild(empty);
    return;
  }

  for (const skill of state.skills) {
    const wrap = document.createElement("div");
    wrap.className = "skill";
    wrap.dataset.id = skill.id;
    wrap.innerHTML = `
      <label class="field-label">Name</label>
      <input class="field-input skill-field" data-field="name" type="text" />
      <label class="field-label">Description (required)</label>
      <input class="field-input skill-field" data-field="description" type="text" />
      <label class="field-label">Instructions (required)</label>
      <textarea class="field-textarea skill-field" data-field="instructions" rows="4"></textarea>
      <button class="danger-btn">Remove skill</button>`;
    for (const field of wrap.querySelectorAll(".skill-field")) {
      field.value = skill[field.dataset.field] || "";
    }
    el.skillList.appendChild(wrap);
  }
}

el.createSkillBtn.addEventListener("click", () => {
  state.skills.push({ id: nextId("s"), name: "", description: "", instructions: "" });
  renderSkills();
  const first = el.skillList.querySelector(".skill:last-child .skill-field");
  if (first) first.focus();
});

el.skillList.addEventListener("input", (event) => {
  const field = event.target.closest(".skill-field");
  if (!field) return;
  const wrap = field.closest(".skill");
  const skill = state.skills.find((s) => s.id === wrap.dataset.id);
  if (skill) skill[field.dataset.field] = field.value;
});

el.skillList.addEventListener("click", (event) => {
  const button = event.target.closest(".danger-btn");
  if (!button) return;
  const wrap = button.closest(".skill");
  state.skills = state.skills.filter((s) => s.id !== wrap.dataset.id);
  renderSkills();
});

el.skillsSearch.addEventListener("input", () => {
  const query = el.skillsSearch.value.trim().toLowerCase();
  for (const card of el.skillList.querySelectorAll(".skill")) {
    const name = card.querySelector('[data-field="name"]').value.toLowerCase();
    card.style.display = !query || name.includes(query) ? "" : "none";
  }
});

el.saveSkillsBtn.addEventListener("click", () => {
  state.savedSkills = JSON.parse(JSON.stringify(state.skills));
  cloudWrite("skills", async (userId) => {
    await cloudDb.upsertSkills(userId, state.skills);
  });
});

el.resetSkillsBtn.addEventListener("click", () => {
  state.skills = JSON.parse(JSON.stringify(state.savedSkills));
  el.skillsSearch.value = "";
  renderSkills();
});

el.generalPanel.addEventListener("click", (event) => {
  const control = event.target.closest(".switch");
  if (!control) return;
  const on = control.classList.toggle("on");
  control.setAttribute("aria-checked", String(on));
});

/* ---------------- new project modal ---------------- */
const newProject = { folder: null, repo: null };

function updateCreateState() {
  el.createProjectBtn.disabled = el.projectName.value.trim().length === 0;
}

function openProjectModal() {
  newProject.folder = null;
  newProject.repo = null;
  el.projectName.value = "";
  el.folderLabel.textContent = "Choose folder";
  el.repoLabel.textContent = "GitHub repository";
  el.chooseFolderBtn.classList.remove("chosen");
  el.chooseRepoBtn.classList.remove("chosen");
  updateCreateState();
  el.projectModal.hidden = false;
  el.projectName.focus();
}

function closeProjectModal() {
  el.projectModal.hidden = true;
  el.newProjectBtn.focus();
}

function createProject() {
  const name = el.projectName.value.trim();
  if (!name) return;
  const id = nextId("p");
  const project = { id, name, folder: newProject.folder, repo: newProject.repo };
  state.projects.unshift(project);
  state.expandedProjectId = id;
  renderProjects();
  renderProjectSublist();
  setScope({ type: "project", id });
  closeProjectModal();
  cloudWrite("project", async (userId) => {
    const row = await cloudDb.createProject(userId, project);
    project.id = row.id;
    state.expandedProjectId = row.id;
  });
}

el.projectName.addEventListener("input", updateCreateState);
el.projectName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    createProject();
  }
});

el.chooseFolderBtn.addEventListener("click", async () => {
  let folder = null;
  if (window.showDirectoryPicker) {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      folder = handle.name;
    } catch (error) {
      if (error && error.name === "AbortError") return;
    }
  } else {
    folder = window.prompt("Folder path");
  }
  if (!folder) return;
  newProject.folder = folder;
  el.folderLabel.textContent = folder;
  el.chooseFolderBtn.classList.add("chosen");
});

el.chooseRepoBtn.addEventListener("click", () => {
  const url = window.prompt("GitHub repository URL");
  if (!url || !url.trim()) return;
  const repo = url.trim().replace(/^https?:\/\/github\.com\//, "");
  newProject.repo = repo;
  el.repoLabel.textContent = repo;
  el.chooseRepoBtn.classList.add("chosen");
});

el.createProjectBtn.addEventListener("click", createProject);
el.closeProjectBtn.addEventListener("click", closeProjectModal);
el.cancelProjectBtn.addEventListener("click", closeProjectModal);
el.projectModal.addEventListener("click", (event) => {
  if (event.target === el.projectModal) closeProjectModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !el.projectModal.hidden) closeProjectModal();
});

/* ---------------- scope / location menus ---------------- */
function renderModePills() {
  const scope = state.scope;
  if (scope.type === "project") {
    const project = state.projects.find((p) => p.id === scope.id);
    el.scopeIco.innerHTML = icons.folder;
    el.scopeLabel.textContent = project ? project.name : "Chat only";
  } else if (scope.type === "folder") {
    el.scopeIco.innerHTML = icons.folder;
    el.scopeLabel.textContent = scope.name;
  } else if (scope.type === "repo") {
    el.scopeIco.innerHTML = icons.github;
    el.scopeLabel.textContent = scope.name;
  } else {
    el.scopeIco.innerHTML = icons.chat;
    el.scopeLabel.textContent = "Chat only";
  }

  el.locationIco.innerHTML = state.location === "cloud" ? icons.cloud : icons.laptop;
  el.locationLabel.textContent = state.location === "cloud" ? "Cloud" : "Local";
}

function hideMenu() {
  el.menu.hidden = true;
}

function showMenu(anchor, items) {
  el.menu.innerHTML = "";
  for (const item of items) {
    if (item.divider) {
      const divider = document.createElement("div");
      divider.className = "menu-divider";
      el.menu.appendChild(divider);
      continue;
    }
    const button = document.createElement("button");
    button.className = "menu-item";
    button.innerHTML = `<span class="menu-ico">${item.icon}</span><span class="menu-label">${escapeHtml(item.label)}</span>${
      item.checked ? icons.check : ""
    }`;
    button.addEventListener("click", () => {
      hideMenu();
      item.action();
    });
    el.menu.appendChild(button);
  }

  el.menu.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const menuRect = el.menu.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 8;
  if (left + menuRect.width > window.innerWidth - 12) left = window.innerWidth - menuRect.width - 12;
  if (top + menuRect.height > window.innerHeight - 12) top = rect.top - menuRect.height - 8;
  el.menu.style.left = `${Math.round(left)}px`;
  el.menu.style.top = `${Math.round(top)}px`;
}

function setScope(scope) {
  state.scope = scope;
  renderModePills();
}

function setLocation(location) {
  state.location = location;
  renderModePills();
}

function openScopeMenu() {
  const items = [
    { icon: icons.plus, label: "New project", action: openProjectModal },
    { icon: icons.chat, label: "Chat only", checked: state.scope.type === "chat", action: () => setScope({ type: "chat" }) },
    { icon: icons.folder, label: "Open folder...", action: pickFolderScope },
    { icon: icons.github, label: "GitHub repository...", action: pickRepoScope },
  ];
  if (state.projects.length) {
    items.push({ divider: true });
    for (const project of state.projects) {
      items.push({
        icon: icons.folder,
        label: project.name,
        checked: state.scope.type === "project" && state.scope.id === project.id,
        action: () => setScope({ type: "project", id: project.id }),
      });
    }
  }
  showMenu(el.scopePill, items);
}

function openLocationMenu() {
  showMenu(el.locationPill, [
    { icon: icons.laptop, label: "Local", checked: state.location === "local", action: () => setLocation("local") },
    { icon: icons.cloud, label: "Cloud", checked: state.location === "cloud", action: () => setLocation("cloud") },
  ]);
}

async function pickFolderScope() {
  let name = null;
  if (window.showDirectoryPicker) {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      name = handle.name;
    } catch (error) {
      if (error && error.name === "AbortError") return;
    }
  } else {
    name = window.prompt("Folder path");
  }
  if (!name) return;
  setScope({ type: "folder", name });
}

function pickRepoScope() {
  const url = window.prompt("GitHub repository URL");
  if (!url || !url.trim()) return;
  setScope({ type: "repo", name: url.trim().replace(/^https?:\/\/github\.com\//, "") });
}

el.scopePill.addEventListener("click", () => {
  const wasOpen = !el.menu.hidden;
  hideMenu();
  if (!wasOpen) openScopeMenu();
});
el.locationPill.addEventListener("click", () => {
  const wasOpen = !el.menu.hidden;
  hideMenu();
  if (!wasOpen) openLocationMenu();
});

document.addEventListener("click", (event) => {
  if (el.menu.hidden) return;
  if (el.menu.contains(event.target) || event.target.closest("#scopePill") || event.target.closest("#locationPill")) return;
  hideMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideMenu();
});
window.addEventListener("resize", hideMenu);

/* ---------------- model picker ---------------- */
function formatCost(model) {
  return model.cost > 0 ? `${model.cost}x` : "Free";
}

function formatHours(hours) {
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!wholeHours) return `${minutes} min`;
  return minutes ? `${wholeHours} h ${minutes} min` : `${wholeHours} h`;
}

function setGauge(gauge, index) {
  const fraction = (index * 2 + 1) / 6;
  gauge.querySelectorAll(".mm-seg i").forEach((fill, position) => {
    const width = Math.min(1, Math.max(0, (fraction - position / 3) * 3));
    fill.style.width = `${width * 100}%`;
  });
  gauge.querySelector(".mm-knob").style.left = `${fraction * 100}%`;
}

function selectedModel() {
  return state.models.find((model) => model.id === state.modelPicker.selectedId) || null;
}

/* daily usage time: 21 h a day, a run spends its modifier times real time */
const USAGE_KEY = "modexa-usage";
let usageRun = null;
let usageTicker = null;

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function saveUsage() {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify({ day: todayKey(), usedHours: state.modelPicker.usedHours }));
  } catch (error) {
    /* storage can be blocked - the used time still counts for this session */
  }
}

function loadUsage() {
  try {
    const saved = JSON.parse(localStorage.getItem(USAGE_KEY) || "null");
    if (saved && saved.day === todayKey() && Number.isFinite(saved.usedHours)) {
      state.modelPicker.usedHours = Math.min(state.modelPicker.budgetHours, Math.max(0, saved.usedHours));
    }
  } catch (error) {
    /* ignore unreadable storage */
  }
}

function runHours() {
  return usageRun ? ((Date.now() - usageRun.startedAt) / 3600000) * usageRun.cost : 0;
}

function liveUsedHours() {
  return Math.min(state.modelPicker.budgetHours, state.modelPicker.usedHours + runHours());
}

function remainingHours() {
  return Math.max(0, state.modelPicker.budgetHours - liveUsedHours());
}

function updateUsageUI() {
  const picker = state.modelPicker;
  const used = liveUsedHours();
  const remaining = Math.max(0, picker.budgetHours - used);
  const percent = Math.min(100, Math.round((used / picker.budgetHours) * 100));

  el.mmUsed.textContent = `${percent}% used`;
  el.mmBarFill.style.width = `${percent}%`;
  el.mmLeft.textContent =
    remaining <= 0 ? "Daily limit reached · resets tomorrow" : `${formatHours(remaining)} left of ${picker.budgetHours} h`;
  el.usageLeft.textContent = remaining <= 0 ? "Daily limit reached" : `${formatHours(remaining)} left`;
  el.app.classList.toggle("quota-empty", remaining <= 0);

  if (usageRun && remaining <= 0) stopUsage();
  updateSendState();
}

function startUsage() {
  const model = selectedModel();
  if (!model || usageRun || model.cost <= 0) return;
  if (remainingHours() <= 0) return;
  usageRun = { startedAt: Date.now(), cost: model.cost };
  usageTicker = window.setInterval(updateUsageUI, 500);
  updateUsageUI();
}

function stopUsage() {
  if (!usageRun) return;
  state.modelPicker.usedHours = liveUsedHours();
  usageRun = null;
  window.clearInterval(usageTicker);
  usageTicker = null;
  saveUsage();
  cloudWrite("usage", async (userId) => {
    await cloudDb.saveUsage(userId, state.modelPicker.usedHours);
  });
  updateUsageUI();
}

function renderModelList() {
  el.mmList.innerHTML = "";

  if (!state.models.length) {
    const empty = document.createElement("p");
    empty.className = "mm-empty";
    empty.textContent = "No models yet.";
    el.mmList.appendChild(empty);
    return;
  }

  for (const model of state.models) {
    const row = document.createElement("button");
    row.className = "mm-row";
    row.classList.toggle("selected", model.id === state.modelPicker.selectedId);
    row.innerHTML = `<span class="mm-name"></span>${model.recommended ? '<span class="mm-badge">Recommended</span>' : ""}<span class="mm-cost"></span>`;
    row.querySelector(".mm-name").textContent = model.name;
    row.querySelector(".mm-cost").textContent = formatCost(model);
    row.addEventListener("click", () => {
      state.modelPicker.selectedId = model.id;
      renderModelMenu();
    });
    el.mmList.appendChild(row);
  }
}

function renderModelMenu() {
  const picker = state.modelPicker;

  el.mmSpeedLabels.querySelectorAll(".mm-speed-label").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.speed) === picker.speed);
  });
  el.mmQualityLabels.querySelectorAll(".mm-speed-label").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.quality) === picker.quality);
  });
  setGauge(el.mmSpeedGauge, picker.speed);
  setGauge(el.mmQualityGauge, picker.quality);

  const model = selectedModel();

  updateUsageUI();

  el.mmBody.hidden = picker.showLess;
  el.mmLess.classList.toggle("open", !picker.showLess);
  el.mmLessLabel.textContent = picker.showLess ? "Show more" : "Show less";
  el.modelPillLabel.textContent = model ? model.name : "Choose model";

  renderModelList();
}

el.modelPill.addEventListener("click", () => {
  const wasOpen = !el.modelMenu.hidden;
  el.modelMenu.hidden = wasOpen;
  if (!wasOpen) renderModelMenu();
});

el.mmSpeedLabels.addEventListener("click", (event) => {
  const button = event.target.closest(".mm-speed-label");
  if (!button) return;
  state.modelPicker.speed = Number(button.dataset.speed);
  renderModelMenu();
});

el.mmQualityLabels.addEventListener("click", (event) => {
  const button = event.target.closest(".mm-speed-label");
  if (!button) return;
  state.modelPicker.quality = Number(button.dataset.quality);
  renderModelMenu();
});

el.mmLess.addEventListener("click", () => {
  state.modelPicker.showLess = !state.modelPicker.showLess;
  renderModelMenu();
});

document.addEventListener("click", (event) => {
  if (el.modelMenu.hidden) return;
  if (el.modelMenu.contains(event.target) || event.target.closest("#modelPill")) return;
  el.modelMenu.hidden = true;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !el.modelMenu.hidden) el.modelMenu.hidden = true;
});

/* ---------------- layout ---------------- */
function setCollapsed(collapsed) {
  state.collapsed = collapsed;
  el.app.classList.toggle("collapsed", collapsed);
}
el.collapseBtn.addEventListener("click", () => setCollapsed(true));
el.expandBtn.addEventListener("click", () => setCollapsed(false));
window.addEventListener("pagehide", stopUsage);

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

/* ---------------- boot ---------------- */
applyTheme();
renderUser();
renderProjects();
renderProjectSublist();
renderSkills();
applyAppearance();
renderChats();
loadMcp();
renderMcp();
renderModePills();
loadUsage();
renderModelMenu();
renderMain();
autosize();
updateSendState();
el.input.focus();
initCloud();
window.setTimeout(checkForUpdates, 1200);
