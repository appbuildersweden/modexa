const REPO = "appbuildersweden/modexa";
const RELEASES_URL = `https://github.com/${REPO}/releases`;

const EXTENSIONS = {
  windows: [".exe", ".msi"],
  macos: [".dmg", ".app.tar.gz"],
  linux: [".appimage", ".deb", ".rpm"],
};

const els = {
  badge: document.getElementById("versionBadge"),
  latestVersion: document.getElementById("latestVersion"),
  latestDate: document.getElementById("latestDate"),
  downloadNote: document.getElementById("downloadNote"),
  heroMeta: document.getElementById("heroMeta"),
  year: document.getElementById("year"),
  heroDownload: document.getElementById("heroDownload"),
  windowVersion: document.getElementById("windowVersion"),
  aboutVersion: document.getElementById("aboutVersion"),
  aboutSize: document.getElementById("aboutSize"),
};

/** Markerar headern när sidan scrollats, så den får en mjuk skugga. */
const header = document.getElementById("siteHeader");
function onScroll() {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 12);
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

function formatSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Hittar installationsfilen för en plattform, utan signaturfiler. */
function findAsset(assets, platform) {
  const suffixes = EXTENSIONS[platform] || [];
  return assets.find((asset) => {
    const name = asset.name.toLowerCase();
    if (name.endsWith(".sig")) return false;
    return suffixes.some((suffix) => name.endsWith(suffix));
  });
}

function setPlatform(platform, asset) {
  const card = document.querySelector(`[data-platform="${platform}"]`);
  const link = document.querySelector(`[data-asset="${platform}"]`);
  const file = document.querySelector(`[data-file="${platform}"]`);
  if (!card || !link || !file) return;

  if (!asset) {
    link.setAttribute("aria-disabled", "true");
    link.href = RELEASES_URL;
    link.textContent = "Coming soon";
    return;
  }
  link.textContent = "Download";

  card.classList.add("is-ready");
  link.href = asset.browser_download_url;
  link.removeAttribute("aria-disabled");
  file.textContent = `${asset.name} · ${formatSize(asset.size)}`;
}

function showNoRelease() {
  els.badge.textContent = "First release is on its way";
  els.latestVersion.textContent = "Not published yet";
  els.latestDate.textContent = "—";
  if (els.windowVersion) els.windowVersion.textContent = "dev";
  if (els.aboutVersion) els.aboutVersion.textContent = "Not published yet";

  els.downloadNote.innerHTML =
    'Installers are built by GitHub Actions. Follow <a href="https://github.com/appbuildersweden/modexa" target="_blank" rel="noreferrer">the repository</a> to see the first build land.';

  for (const platform of Object.keys(EXTENSIONS)) {
    const link = document.querySelector(`[data-asset="${platform}"]`);
    if (link) {
      link.setAttribute("aria-disabled", "true");
      link.href = RELEASES_URL;
      link.textContent = "Coming soon";
    }
  }
}

function applyRelease(release) {
  const version = release.tag_name || release.name || "";
  const assets = Array.isArray(release.assets) ? release.assets : [];

  els.badge.textContent = version ? `${version} is out` : "Latest release is available";
  els.latestVersion.textContent = version || "—";
  els.latestDate.textContent = formatDate(release.published_at);

  const windows = findAsset(assets, "windows");
  setPlatform("windows", windows);
  setPlatform("macos", findAsset(assets, "macos"));
  setPlatform("linux", findAsset(assets, "linux"));

  if (windows) {
    els.heroDownload.href = windows.browser_download_url;
    els.heroMeta.textContent = `Windows installer · ${formatSize(windows.size)} · macOS and Linux on GitHub`;
  }

  if (els.windowVersion) els.windowVersion.textContent = version || "—";
  if (els.aboutVersion) els.aboutVersion.textContent = version ? `Modexa ${version.replace(/^v/, "")}` : "Latest build";
  if (els.aboutSize) els.aboutSize.textContent = windows ? `${formatSize(windows.size)} for Windows` : "installer size";

  els.downloadNote.textContent = version
    ? `Downloads come from release ${version}. Older builds live on GitHub.`
    : "Downloads come from the latest GitHub release.";
}

async function loadLatestRelease() {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (response.status === 404) {
      showNoRelease();
      return;
    }
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);

    applyRelease(await response.json());
  } catch (error) {
    els.badge.textContent = "Release info unavailable";
    if (els.windowVersion) els.windowVersion.textContent = "—";
    els.downloadNote.textContent =
      "Couldn't reach GitHub right now — the download buttons still open the releases page.";
  }
}

els.year.textContent = String(new Date().getFullYear());
loadLatestRelease();
