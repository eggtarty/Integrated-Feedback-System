/* ================================================
   HR FEEDBACK PORTAL — script.js
   Updated: Category-specific fields, video support,
   transport vendor info, optional email
   ================================================ */

const POWER_AUTOMATE_URLS = {
  Canteen:        "https://YOUR_CANTEEN_FLOW_URL",
  Locker:         "https://YOUR_LOCKER_FLOW_URL",
  ESD:            "https://YOUR_ESD_FLOW_URL",
  Transportation: "https://YOUR_TRANSPORTATION_FLOW_URL",
};

const CATEGORY_CONFIG = {
  Canteen:        { emoji: "🍽️", labelBM: "Kantin" },
  Locker:         { emoji: "🔐", labelBM: "Loker" },
  ESD:            { emoji: "⚡", labelBM: "ESD" },
  Transportation: { emoji: "🚌", labelBM: "Pengangkutan" },
};

const CATEGORY_PREFIX = {
  Canteen: "CN", Locker: "LK", ESD: "ES", Transportation: "TR",
};

function getNextID(category) {
  const key = "fb_counter_" + category.toLowerCase();
  let n = parseInt(localStorage.getItem(key) || "0") + 1;
  localStorage.setItem(key, n);
  return CATEGORY_PREFIX[category] + String(n).padStart(3, "0");
}

let selectedCategory = null;
let mediaFiles = [];
const MAX_FILES      = 5;
const MIN_FILES      = 1;
const MAX_SIZE       = 20 * 1024 * 1024;  // 20MB per file
const MAX_TOTAL_SIZE = 60 * 1024 * 1024;  // 60MB total (~80MB after base64, safely under PA 102MB limit)

const ALLOWED_TYPES = {
  "image/jpeg": "image", "image/jpg": "image", "image/png": "image",
  "video/mp4": "video", "video/quicktime": "video",
};

// ─── SCREEN NAVIGATION ───
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function selectCategory(btn) {
  selectedCategory = btn.dataset.category;
  const cfg = CATEGORY_CONFIG[selectedCategory];
  document.getElementById("badgeEmoji").textContent = cfg.emoji;
  document.getElementById("badgeName").textContent  = `${selectedCategory} / ${cfg.labelBM}`;
  document.getElementById("formTitle").textContent  = `${selectedCategory} Complaint Form`;
  document.getElementById("formSub").textContent    = `Borang Aduan — ${cfg.labelBM}`;
  document.getElementById("categoryField").value    = selectedCategory;
  document.querySelectorAll(".cat-fields").forEach(el => el.style.display = "none");
  const catEl = document.getElementById("fields-" + selectedCategory);
  if (catEl) catEl.style.display = "block";

  // Adjust section numbers — ESD skips section 02 so complaint = 02, evidence = 03
  const isESD = selectedCategory === "ESD";
  const numComplaint = document.getElementById("sec-num-complaint");
  const numEvidence  = document.getElementById("sec-num-evidence");
  if (numComplaint) numComplaint.textContent = isESD ? "02" : "03";
  if (numEvidence)  numEvidence.textContent  = isESD ? "03" : "04";
  const sec2 = document.getElementById("section-category-fields");
  const sec2divider = document.getElementById("section-category-divider");
  if (selectedCategory === "ESD") {
    sec2.style.display = "none";
    if (sec2divider) sec2divider.style.display = "none";
  } else {
    sec2.style.display = "block";
    if (sec2divider) sec2divider.style.display = "block";
  }
  resetForm();
  showScreen("screen-form");
}

function goBack() {
  showScreen("screen-category");
  selectedCategory = null;
}

// ─── DOM REFS ───
const form         = document.getElementById("feedbackForm");
const uploadZone   = document.getElementById("uploadZone");
const imageInput   = document.getElementById("imageInput");
const previewGrid  = document.getElementById("previewGrid");
const imageCounter = document.getElementById("imageCounter");
const imageCountTx = document.getElementById("imageCountText");
const clearAllBtn  = document.getElementById("clearAllBtn");
const feedbackMsg  = document.getElementById("feedbackMsg");
const charCount    = document.getElementById("charCount");
const submitBtn    = document.getElementById("submitBtn");
const btnText      = document.getElementById("btnText");
const btnLoader    = document.getElementById("btnLoader");
const successOv    = document.getElementById("successOverlay");
const refCode      = document.getElementById("refCode");
const anotherBtn   = document.getElementById("anotherBtn");

feedbackMsg.addEventListener("input", () => { charCount.textContent = feedbackMsg.value.length; });

// ─── UPLOAD ZONE ───
uploadZone.addEventListener("click", () => { if (mediaFiles.length < MAX_FILES) imageInput.click(); });
uploadZone.addEventListener("dragover", (e) => { e.preventDefault(); uploadZone.classList.add("drag-over"); });
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault(); uploadZone.classList.remove("drag-over");
  handleFiles(Array.from(e.dataTransfer.files));
});
imageInput.addEventListener("change", (e) => { handleFiles(Array.from(e.target.files)); imageInput.value = ""; });

function handleFiles(files) {
  hideErr("err-images");
  for (const file of files) {
    if (mediaFiles.length >= MAX_FILES) break;
    const fileKind = ALLOWED_TYPES[file.type];
    if (!fileKind) { alert(`"${file.name}" not supported. Only JPG, PNG, MP4, MOV allowed.`); continue; }
    if (file.size > MAX_SIZE) { alert(`"${file.name}" exceeds 20MB limit.`); continue; }

    // Check total size cap
    const currentTotal = mediaFiles.reduce((sum, f) => sum + f.file.size, 0);
    if (currentTotal + file.size > MAX_TOTAL_SIZE) {
      alert(`Total upload limit is 80MB.\nFail melebihi had jumlah 80MB.`);
      break;
    }

    if (fileKind === "video") {
      mediaFiles.push({ file, kind: "video", name: file.name, dataURL: null, base64: null });
      renderPreviews(); updateCounter();
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        mediaFiles.push({ file, kind: "image", base64: e.target.result.split(",")[1], dataURL: e.target.result, name: file.name });
        renderPreviews(); updateCounter();
      };
      reader.readAsDataURL(file);
    }
  }
}

function renderPreviews() {
  previewGrid.innerHTML = "";
  mediaFiles.forEach((item, index) => {
    const el = document.createElement("div");
    el.className = "preview-item";
    if (item.kind === "video") {
      el.innerHTML = `<div class="video-thumb"><span class="video-play-icon">🎥</span><div class="img-label">${item.name}</div></div><button type="button" class="remove-btn" data-index="${index}" title="Remove">✕</button>`;
    } else {
      el.innerHTML = `<img src="${item.dataURL}" alt="Preview ${index+1}"/><button type="button" class="remove-btn" data-index="${index}" title="Remove">✕</button><div class="img-label">${item.name}</div>`;
    }
    previewGrid.appendChild(el);
  });
  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      mediaFiles.splice(parseInt(e.currentTarget.dataset.index), 1);
      renderPreviews(); updateCounter();
    });
  });
}

function updateCounter() {
  if (mediaFiles.length > 0) {
    imageCounter.style.display = "flex";
    imageCountTx.textContent = `${mediaFiles.length} / ${MAX_FILES} file${mediaFiles.length > 1 ? "s" : ""} selected`;
  } else { imageCounter.style.display = "none"; }
}

clearAllBtn.addEventListener("click", () => { mediaFiles = []; renderPreviews(); updateCounter(); });

// ─── CANTEEN OTHERS TOGGLE ───
function onCanteenIssueChange() {
  const checked = document.querySelector('input[name="canteenIssue"]:checked');
  const othersWrap = document.getElementById("canteenOthersWrap");
  document.getElementById("canteenOthers").value = "";
  hideErr("err-canteenOthers");
  othersWrap.style.display = (checked && checked.value === "Others / Lain-lain") ? "block" : "none";
}

// ─── LOCKER OTHERS TOGGLE ───
function onLockerIssueChange() {
  const val = document.getElementById("lockerIssue").value;
  const othersWrap = document.getElementById("lockerOthersWrap");
  document.getElementById("lockerOthers").value = "";
  hideErr("err-lockerOthers");
  othersWrap.style.display = val === "Others / Lain-lain" ? "block" : "none";
}

// ─── TRANSPORT CASCADING DROPDOWNS ───
function onTransportCategoryChange() {
  const val = document.getElementById("transportCategory").value;

  // Reset and hide all sub-dropdowns
  document.getElementById("driverAttitudeWrap").style.display       = "none";
  document.getElementById("driverAttitudeOthersWrap").style.display = "none";
  document.getElementById("vehicleIssueWrap").style.display         = "none";
  document.getElementById("vehicleIssueOthersWrap").style.display   = "none";
  document.getElementById("driverAttitudeIssue").value  = "";
  document.getElementById("driverAttitudeOthers").value = "";
  document.getElementById("vehicleIssueType").value     = "";
  document.getElementById("vehicleIssueOthers").value   = "";

  // Clear errors
  ["err-transportCategory","err-driverAttitudeIssue","err-driverAttitudeOthers",
   "err-vehicleIssueType","err-vehicleIssueOthers"].forEach(id => hideErr(id));

  if (val === "Driver Attitude / Sikap Pemandu") {
    document.getElementById("driverAttitudeWrap").style.display = "block";
  } else if (val === "Vehicle Issue / Isu Kenderaan") {
    document.getElementById("vehicleIssueWrap").style.display = "block";
  }
}

function onDriverAttitudeChange() {
  const val = document.getElementById("driverAttitudeIssue").value;
  const othersWrap = document.getElementById("driverAttitudeOthersWrap");
  document.getElementById("driverAttitudeOthers").value = "";
  hideErr("err-driverAttitudeOthers");
  othersWrap.style.display = val === "Others / Lain-lain" ? "block" : "none";
}

function onVehicleIssueChange() {
  const val = document.getElementById("vehicleIssueType").value;
  const othersWrap = document.getElementById("vehicleIssueOthersWrap");
  document.getElementById("vehicleIssueOthers").value = "";
  hideErr("err-vehicleIssueOthers");
  othersWrap.style.display = val === "Others / Lain-lain" ? "block" : "none";
}


function showErr(id) {
  const el = document.getElementById(id); const field = document.getElementById(id.replace("err-",""));
  if (el) el.classList.add("show"); if (field) field.classList.add("is-error");
}
function hideErr(id) {
  const el = document.getElementById(id); const field = document.getElementById(id.replace("err-",""));
  if (el) el.classList.remove("show"); if (field) field.classList.remove("is-error");
}
["empName","empID","empPhone","feedbackMsg","empPlant"].forEach(id => {
  const el = document.getElementById(id);
  if (el) { el.addEventListener("input", () => hideErr("err-"+id)); el.addEventListener("change", () => hideErr("err-"+id)); }
});

// ─── VALIDATION ───
function validateForm() {
  let valid = true;
  [
    { id: "empName",     fn: v => v.trim().length > 0 },
    { id: "empID",       fn: v => v.trim().length > 0 },
    { id: "empPhone",    fn: v => v.trim().length > 0 },
    { id: "empPlant",    fn: v => v !== "" },
    { id: "feedbackMsg", fn: v => v.trim().length > 0 },
  ].forEach(({ id, fn }) => {
    const el = document.getElementById(id);
    if (!fn(el.value)) { showErr("err-"+id); valid = false; } else hideErr("err-"+id);
  });

  // Email optional — only validate format if filled
  const emailEl = document.getElementById("empEmail");
  if (emailEl.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
    showErr("err-empEmail"); valid = false;
  } else hideErr("err-empEmail");

  if (selectedCategory === "Canteen") {
    const checked = document.querySelector('input[name="canteenIssue"]:checked');
    if (!checked) { showErr("err-canteenIssue"); valid = false; }
    else {
      hideErr("err-canteenIssue");
      if (checked.value === "Others / Lain-lain") {
        const othersEl = document.getElementById("canteenOthers");
        if (!othersEl.value.trim()) { showErr("err-canteenOthers"); valid = false; }
        else hideErr("err-canteenOthers");
      }
    }
    if (!document.getElementById("incidentDate").value) { showErr("err-incidentDate"); valid = false; } else hideErr("err-incidentDate");
    if (!document.getElementById("incidentTime").value) { showErr("err-incidentTime"); valid = false; } else hideErr("err-incidentTime");
  }
  if (selectedCategory === "Locker") {
    const lockerEl = document.getElementById("lockerIssue");
    if (!lockerEl.value) { showErr("err-lockerIssue"); valid = false; }
    else {
      hideErr("err-lockerIssue");
      if (lockerEl.value === "Others / Lain-lain") {
        const othersEl = document.getElementById("lockerOthers");
        if (!othersEl.value.trim()) { showErr("err-lockerOthers"); valid = false; }
        else hideErr("err-lockerOthers");
      }
    }
  }
  if (selectedCategory === "Transportation") {
    const transCat = document.getElementById("transportCategory");
    if (!transCat.value) { showErr("err-transportCategory"); valid = false; }
    else {
      hideErr("err-transportCategory");
      if (transCat.value === "Driver Attitude / Sikap Pemandu") {
        const attitudeEl = document.getElementById("driverAttitudeIssue");
        if (!attitudeEl.value) { showErr("err-driverAttitudeIssue"); valid = false; }
        else {
          hideErr("err-driverAttitudeIssue");
          if (attitudeEl.value === "Others / Lain-lain") {
            const othersEl = document.getElementById("driverAttitudeOthers");
            if (!othersEl.value.trim()) { showErr("err-driverAttitudeOthers"); valid = false; }
            else hideErr("err-driverAttitudeOthers");
          }
        }
      } else if (transCat.value === "Vehicle Issue / Isu Kenderaan") {
        const vehicleEl = document.getElementById("vehicleIssueType");
        if (!vehicleEl.value) { showErr("err-vehicleIssueType"); valid = false; }
        else {
          hideErr("err-vehicleIssueType");
          if (vehicleEl.value === "Others / Lain-lain") {
            const othersEl = document.getElementById("vehicleIssueOthers");
            if (!othersEl.value.trim()) { showErr("err-vehicleIssueOthers"); valid = false; }
            else hideErr("err-vehicleIssueOthers");
          }
        }
      }
    }
    [
      { id: "routeName",        fn: v => v.trim().length > 0 },
      { id: "driverName",       fn: v => v.trim().length > 0 },
      { id: "vehiclePlate",     fn: v => v.trim().length > 0 },
      { id: "transportCompany", fn: v => v !== "" },
    ].forEach(({ id, fn }) => {
      const el = document.getElementById(id);
      if (!fn(el.value)) { showErr("err-"+id); valid = false; } else hideErr("err-"+id);
    });
  }

  if (mediaFiles.length < MIN_FILES) { showErr("err-images"); valid = false; } else hideErr("err-images");
  return valid;
}

function getCategoryExtras() {
  if (selectedCategory === "Canteen") {
    const checked = document.querySelector('input[name="canteenIssue"]:checked');
    const issueVal = checked ? checked.value : "";
    return {
      issueType: issueVal === "Others / Lain-lain"
        ? document.getElementById("canteenOthers").value.trim()
        : issueVal,
      incidentDate:      document.getElementById("incidentDate").value,
      incidentTime:      document.getElementById("incidentTime").value,
      incidentTimeExact: document.getElementById("incidentTimeSpecific").value.trim(),
    };
  }
  if (selectedCategory === "Locker") {
    const lockerVal = document.getElementById("lockerIssue").value;
    return {
      issueType: lockerVal === "Others / Lain-lain"
        ? document.getElementById("lockerOthers").value.trim()
        : lockerVal,
    };
  }
  if (selectedCategory === "Transportation") {
    const transCat    = document.getElementById("transportCategory").value;
    const isDriver    = transCat === "Driver Attitude / Sikap Pemandu";
    const attitudeVal = document.getElementById("driverAttitudeIssue").value;
    const vehicleVal  = document.getElementById("vehicleIssueType").value;
    return {
      transportCategory: transCat,
      issueType: isDriver
        ? (attitudeVal === "Others / Lain-lain" ? document.getElementById("driverAttitudeOthers").value.trim() : attitudeVal)
        : (vehicleVal  === "Others / Lain-lain" ? document.getElementById("vehicleIssueOthers").value.trim()  : vehicleVal),
      routeName:        document.getElementById("routeName").value.trim(),
      driverName:       document.getElementById("driverName").value.trim(),
      vehiclePlate:     document.getElementById("vehiclePlate").value.trim(),
      transportCompany: document.getElementById("transportCompany").value,
    };
  }
  return {};
}

// ─── FORM SUBMIT ───
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateForm()) return;
  const category   = selectedCategory;
  const responseID = getNextID(category);
  const employeeID = document.getElementById("empID").value.trim();
  const slug       = category.toLowerCase();

  const mediaPayload = mediaFiles.map((item, i) => ({
    fileName: `${slug}_${responseID}_${employeeID}_${i+1}.${item.name.split(".").pop().toLowerCase()}`,
    kind:     item.kind,
    base64:   item.kind === "image" ? item.base64 : null,
    sizeMB:   (item.file.size / (1024*1024)).toFixed(2),
  }));

  const payload = {
    category, responseID,
    name:        document.getElementById("empName").value.trim(),
    employeeID,
    phone:       document.getElementById("empPhone").value.trim(),
    email:       document.getElementById("empEmail").value.trim() || null,
    plant:       document.getElementById("empPlant").value,
    feedback:    document.getElementById("feedbackMsg").value.trim(),
    submittedAt: new Date().toISOString(),
    totalFiles:  mediaPayload.length,
    media:       mediaPayload,
    ...getCategoryExtras(),
  };

  console.log("📤 Submitting:", category, responseID);
  submitBtn.disabled = true;
  btnText.style.display = "none";
  btnLoader.style.display = "flex";

  const url = POWER_AUTOMATE_URLS[category];
  try {
    const res = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showSuccess(responseID, category);
  } catch (err) {
    console.error(err);
    if (url.includes("YOUR_")) { console.warn("⚠ Prototype mode."); showSuccess(responseID, category); }
    else alert("Submission failed. Please try again.\nPenghantaran gagal. Sila cuba lagi.");
  } finally {
    submitBtn.disabled = false;
    btnText.style.display = "flex";
    btnLoader.style.display = "none";
  }
});

function showSuccess(id, category) {
  const cfg = CATEGORY_CONFIG[category];
  refCode.textContent = id;
  document.getElementById("successCatTag").textContent = `${cfg.emoji}  ${category} / ${cfg.labelBM}`;
  successOv.classList.add("show");
}

function resetForm() {
  form.reset();
  mediaFiles = [];
  renderPreviews();
  updateCounter();
  charCount.textContent = "0";
  document.querySelectorAll(".err").forEach(el => el.classList.remove("show"));
  document.querySelectorAll(".is-error").forEach(el => el.classList.remove("is-error"));
  document.querySelectorAll('input[name="canteenIssue"]').forEach(r => r.checked = false);
  // Reset Others wrap visibility
  ["canteenOthersWrap","lockerOthersWrap"].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = "none";
  });
  // Reset transport cascading dropdowns
  ["driverAttitudeWrap","driverAttitudeOthersWrap","vehicleIssueWrap","vehicleIssueOthersWrap"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = "none"; });
}

anotherBtn.addEventListener("click", () => {
  successOv.classList.remove("show");
  showScreen("screen-category");
  selectedCategory = null;
});
