/* =============================================================
   renderer.js — IronStar Salon | Frontend Logic
   Handles: UI interactions, customer lookup, service management,
            visit tracking, WhatsApp messaging, reports & data ops
   ============================================================= */


/* =============================================================
   SECTION 1: GLOBAL STATE
   These variables are shared across functions to track the
   current billing session's services and running total.
   ============================================================= */

let total = 0;          // Running total for the current visit (₹)
let services = [];      // List of service names added in current visit
let allCustomers = [];  // Full customer list loaded for the CRM tab
let serviceMap = {};    // Maps service name → price for quick lookups (used in repeatLastVisit)

const appState = {
  staff: "Senior",
  payment: "UPI"
};


/* =============================================================
   SECTION 2: DOM REFERENCES
   Cached references to frequently used input elements.
   ============================================================= */

const phoneInput = document.getElementById("phone");
const nameInput = document.getElementById("name");

document.addEventListener("DOMContentLoaded", () => {

  // STAFF
  document.querySelectorAll(".staff-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".staff-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      appState.staff = btn.dataset.staff;
    });
  });

  // PAYMENT
  document.querySelectorAll(".payment-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".payment-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      appState.payment = btn.dataset.mode;
    });
  });

});
/* =============================================================
   SECTION 3: PHONE INPUT — VALIDATION & AUTOCOMPLETE
   - Strips non-numeric characters as the user types
   - Shows a live dropdown of matching customers based on phone
   - Clicking a suggestion auto-fills both phone and name fields
   ============================================================= */

   // -----------------------------
// SECTION 3: PHONE INPUT + AUTOCOMPLETE (ENHANCED)
// -----------------------------

let selectedIndex = -1;
let currentSuggestions = [];

// Keep only digits in phone input
phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, "");
});

// Show autocomplete suggestions
phoneInput.addEventListener("input", async () => {
  const phone = phoneInput.value;
  const box = document.getElementById("suggestionsBox");

  if (phone.length < 2) {
    box.style.display = "none";
    return;
  }

  const customers = await window.api.getCustomers("all");

  currentSuggestions = customers.filter(c => c.phone.includes(phone));
  selectedIndex = -1;

  box.innerHTML = "";

  if (currentSuggestions.length === 0) {
    box.style.display = "none";
    return;
  }

  renderSuggestions();
});

// Render suggestions (reusable)
function renderSuggestions() {
  const box = document.getElementById("suggestionsBox");
  box.innerHTML = "";

  currentSuggestions.forEach((c, index) => {
    const item = document.createElement("div");

    item.innerText = `${c.name} (${c.phone})`;
    item.style.padding = "6px";
    item.style.cursor = "pointer";

    // Highlight selected item
    if (index === selectedIndex) {
      item.style.background = "#333";
      item.style.color = "#fff";
    }

    // Mouse select
    item.onmousedown = () => selectCustomer(index);

    // Hover effect
    item.onmouseover = () => {
      selectedIndex = index;
      renderSuggestions();
    };

    item.onmouseout = () => {
      item.style.background = "";
      item.style.color = "";
    };

    box.appendChild(item);
  });

  box.style.display = "block";
}

// Select customer
function selectCustomer(index) {
  const c = currentSuggestions[index];
  if (!c) return;

  const box = document.getElementById("suggestionsBox");

  phoneInput.value = c.phone;
  nameInput.value = c.name;

  box.style.display = "none";

  phoneInput.dispatchEvent(new Event("blur"));
}

// Keyboard navigation
phoneInput.addEventListener("keydown", (e) => {
  if (!currentSuggestions.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex = (selectedIndex + 1) % currentSuggestions.length;
    renderSuggestions();
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex =
      (selectedIndex - 1 + currentSuggestions.length) %
      currentSuggestions.length;
    renderSuggestions();
  }

  if (e.key === "Enter") {
    e.preventDefault();
    selectCustomer(selectedIndex);
  }
});

// Close suggestions on outside click
document.addEventListener("click", (e) => {
  const box = document.getElementById("suggestionsBox");

  if (!phoneInput.contains(e.target)) {
    box.style.display = "none";
  }
});

/* =============================================================
   SECTION 4: CUSTOMER AUTO-DETECTION ON PHONE BLUR
   When the user leaves the phone field:
   - Auto-fills the name if the customer exists
   - Shows their last visit summary (services + total)
   ============================================================= */

phoneInput.addEventListener("blur", async () => {
  const phone = phoneInput.value;

  if (!phone) return;

  const el = document.getElementById("lastVisitInfo");
  const customer = await window.api.findCustomer(phone);

  if (customer) {
    // Auto-fill the name field for existing customers
    nameInput.value = customer.name;

    // Fetch and display the most recent visit details
    const visit = await window.api.getLastVisit(phone);

    if (visit) {
      el.style.display = "block";
      el.innerText =
        `Last Visit: ${visit.services} | ₹${visit.total} (Click Repeat to reuse)`;
    } else {
      // Customer exists but has no recorded visits
      el.style.display = "none";
      el.innerText = "";
    }

  } else {
    // Unknown customer — clear name and hide last visit info
    nameInput.value = "";
    el.style.display = "none";
    el.innerText = "";
  }
});


/* =============================================================
   SECTION 5: WHATSAPP MESSAGING
   Sends a formatted visit summary to the customer via WhatsApp Web.
   Opens in a new tab using the wa.me API link.
   ============================================================= */

function sendWhatsApp() {
  const phone = phoneInput.value.trim();
  const name = nameInput.value.trim();

  if (!phone || !name) {
    document.getElementById("status").innerText = "Enter customer details first";
    return;
  }

  // Build the visit summary message with services and total
  let message =
`Hey ${name}, thanks for visiting IronStar Salon ✂️

Here's your visit summary:

💇 Services:
${services.map(s => `• ${s}`).join("\n")}

💰 Total: ₹${total}
📅 ${new Date().toLocaleString("en-IN")}

We hope to serve you again soon 🙌

⭐ Loved the experience? Please leave us a quick review:
https://maps.app.goo.gl/8kTAqnhdbhQsWP6x7`;

  // Normalize unicode and line endings to prevent encoding issues
  message = message
    .trim()
    .normalize("NFC")
    .replace(/\uFFFD/g, "")   // Remove replacement characters
    .replace(/\r?\n/g, "\n"); // Standardize newlines

  const encodedMessage = encodeURIComponent(message);

  // Open WhatsApp chat with the pre-filled message
  const url = `https://api.whatsapp.com/send?phone=91${phone}&text=${encodedMessage}`;
  window.open(url, "_blank");
}


/* =============================================================
   SECTION 6: BILLING — ADD SERVICE TO CURRENT VISIT
   Adds a service to the session's list and updates the running total.
   ============================================================= */

// Add a service to the current billing session
function addService(name, price) {
  services.push(name);
  total += price;
  document.getElementById("total").innerText = total;
}


/* =============================================================
   SECTION 7: INCOME DASHBOARD
   Loads and displays today's, this week's, and this month's income.
   ============================================================= */

async function loadIncome() {
  const data = await window.api.getIncome();

  console.log("Income Data:", data); // Debug log for income API response

  document.getElementById("todayIncome").innerText = data.today;
  document.getElementById("weekIncome").innerText = data.week;
  document.getElementById("monthIncome").innerText = data.month;
}


/* =============================================================
   SECTION 8: SERVICE BUTTONS
   Dynamically renders clickable service buttons on the billing screen.
   Also rebuilds the serviceMap (name → price) for repeat-visit lookups.
   ============================================================= */

async function loadServices() {
  const services = await window.api.getServices();

  const container = document.getElementById("servicesContainer");
  container.innerHTML = "";

  serviceMap = {}; // Reset the map before repopulating

  services.forEach(service => {
    // Store price in map so repeatLastVisit can recalculate totals
    serviceMap[service.name] = service.price;

    // Create a button for each service
    const btn = document.createElement("button");
    btn.innerText = `${service.name} ₹${service.price}`;
    btn.onclick = () => addService(service.name, service.price);

    container.appendChild(btn);
  });
}


/* =============================================================
   SECTION 9: SERVICE MANAGEMENT (ADMIN)
   Functions to add, update, delete, and list services from the
   admin panel.
   ============================================================= */

// Add a new service using the name/price inputs in the admin panel
async function addNewService() {
  const name = document.getElementById("serviceName").value;
  const price = document.getElementById("servicePrice").value;

  if (!name || !price) {
    document.getElementById("status").innerText = "Enter service details";
    return;
  }

  await window.api.addService({ name, price });

  // Refresh both the billing buttons and the admin list
  loadServices();
  loadServiceList();
}

// Render the admin service list with inline price editing and delete controls
async function loadServiceList() {
  const services = await window.api.getServices();

  const container = document.getElementById("serviceList");
  container.innerHTML = "";

  services.forEach(s => {
    const row = document.createElement("div");
    row.style.marginBottom = "6px";

    // Each row shows the service name, an editable price field, Update & Delete buttons
    row.innerHTML = `
  ${s.name} - ₹ 
  <input 
    type="number" 
    value="${s.price}" 
    id="price-${s.id}" 
    style="width:60px"
    onkeypress="if(event.key==='Enter') updateServicePrice(${s.id})"
  />
  <button class="btn btn-secondary" onclick="updateServicePrice(${s.id})">
  Update
</button>

<button class="btn btn-danger" onclick="deleteService(${s.id})">
  Delete
</button>
`;

    container.appendChild(row);
  });
}

// Update the price of a specific service by its ID
async function updateServicePrice(id) {
  const price = document.getElementById(`price-${id}`).value;

  if (!price) {
    document.getElementById("status").innerText = "Enter valid price";
    return;
  }

  await window.api.updateService({ id, price });

  document.getElementById("status").innerText = "Price updated!";

  // Refresh billing buttons and admin list to reflect new price
  loadServices();
  loadServiceList();
}

// Delete a service permanently and refresh both views
async function deleteService(id) {
  await window.api.deleteService(id);

  loadServices();
  loadServiceList();
}


/* =============================================================
   SECTION 10: VISIT HISTORY
   Displays a customer's full visit history or a filtered date-range
   subset inside the history panel.
   ============================================================= */

// Load and display all visits for the current customer
async function viewHistory() {
  const phone = phoneInput.value;

  if (!phone) return;

  const visits = await window.api.getVisitHistory(phone);

  const box = document.getElementById("historyBox");
  box.innerHTML = "<h4>Visit History</h4>";

  if (visits.length === 0) {
    box.innerHTML += "<p style='color:gray'>No history found</p>";
    return;
  }

  visits.forEach(v => {
    const div = document.createElement("div");

    // Split comma-separated services, remove duplicates, then display cleanly
    const servicesArr = v.services.split(",");
    const uniqueServices = [...new Set(servicesArr)];
    const formattedServices = uniqueServices.join(", ");

   div.innerHTML = `
  <strong>${formattedServices}</strong>
  <span style="float:right;">₹${v.total}</span>
  <br>
  <small>
    ${v.paymentMode || "N/A"} | ${v.staff || "N/A"} | 
    ${new Date(v.date).toLocaleDateString()}
  </small>
`;

    box.appendChild(div);
  });
}

// Filter a customer's visit history between two dates and display results
async function filterByDate() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  const phone = phoneInput.value;

  if (!phone) {
    document.getElementById("status").innerText = "Enter phone first";
    return;
  }

  const data = await window.api.filterByDate({ from, to, phone });

  const box = document.getElementById("historyBox");
  box.innerHTML = "<h4>Filtered History</h4>";

  if (data.length === 0) {
    box.innerHTML += "<p style='color:gray'>No history found</p>";
    return;
  }

  data.forEach(v => {
    const div = document.createElement("div");
    div.innerText = `${v.services} | ₹${v.total} | ${new Date(v.date).toLocaleDateString()}`;
    box.appendChild(div);
  });
}


/* =============================================================
   SECTION 11: REPEAT LAST VISIT
   Reloads the services and total from the customer's most recent
   visit so the same billing can be quickly reused.
   ============================================================= */

async function repeatLastVisit() {
  const phone = phoneInput.value;

  if (!phone) {
    document.getElementById("status").innerText = "Enter phone first";
    return;
  }

  const visit = await window.api.getLastVisit(phone);

  if (!visit) {
    document.getElementById("status").innerText = "No previous visit found";
    return;
  }

  // Reset billing session before loading previous visit
  total = 0;
  services = [];

  // Re-add each service from the last visit using serviceMap for pricing
  const prevServices = visit.services.split(",");
  prevServices.forEach(service => {
    services.push(service);
    total += serviceMap[service] || 0; // Default to 0 if price not found in map
  });

  // Update the total display
  document.getElementById("total").innerText = total;

  // Update the last visit info banner to indicate it was reused
  const el = document.getElementById("lastVisitInfo");
  el.style.display = "block";
  el.innerText = `Last Visit: ${visit.services} | ₹${visit.total} (reused)`;

  document.getElementById("status").innerText = "Loaded last visit!";
}


/* =============================================================
   SECTION 12: CRM — CUSTOMER LIST & BULK WHATSAPP OFFERS
   Loads customers filtered by type (all / inactive / VIP),
   supports search filtering, and enables sending bulk WhatsApp
   offers to individual customers.
   ============================================================= */

// Load customers based on the selected filter (all / inactive / VIP)
async function loadCustomers() {
  const filter = document.getElementById("filterType").value;

  allCustomers = await window.api.getCustomers(filter);

  displayCustomers(allCustomers);
}

// Render the customer list with Send buttons for WhatsApp offers
function displayCustomers(customers) {
  const container = document.getElementById("customerList");
  container.innerHTML = "";

  const filter = document.getElementById("filterType").value;

  customers.forEach(cust => {
    const row = document.createElement("div");
    row.classList.add("customer-row");

    // Apply visual class based on customer status
    if (filter === "inactive") {
      row.classList.add("inactive");
    } else if (cust.visit_count && cust.visit_count >= 5) {
      row.classList.add("vip"); // VIP: 5+ visits
    }

    row.innerHTML = `
      <span id="cust-${cust.phone}">
        ${cust.name} (${cust.phone})
      </span>
      <button class="btn btn-secondary"
  onclick="sendToCustomer('${cust.phone}', '${cust.name}')">
  Send
</button>
    `;

    container.appendChild(row);
  });
}

// Filter the already-loaded customer list by name or phone (client-side)
function filterCustomers() {
  const search = document.getElementById("searchInput").value.toLowerCase();

  const filtered = allCustomers.filter(cust =>
    cust.name.toLowerCase().includes(search) ||
    cust.phone.includes(search)
  );

  displayCustomers(filtered);
}

// Enable/disable Send buttons depending on whether an offer message has been typed
function toggleSendButtons() {
  const message = document.getElementById("offerMessage").value;
  const buttons = document.querySelectorAll("#customerList button");

  buttons.forEach(btn => {
    btn.disabled = !message;
  });
}

// Send a custom offer message to a specific customer via WhatsApp
function sendToCustomer(phone, name) {
  let message = document.getElementById("offerMessage").value;

  if (!message.trim()) {
    document.getElementById("status").innerText = "Enter offer message";
    return;
  }

  // Normalize unicode and line endings to prevent encoding issues
  message = message
    .trim()
    .normalize("NFC")
    .replace(/\uFFFD/g, "")   // Remove replacement characters
    .replace(/\r?\n/g, "\n"); // Standardize newlines

  const encodedMessage = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send?phone=91${phone}&text=${encodedMessage}`;
  window.open(url, "_blank");

  // Mark this customer as "sent" with a checkmark in the UI
  const el = document.getElementById(`cust-${phone}`);
  if (el && !el.innerText.includes("✅")) {
    el.innerText += " ✅";
  }
}


/* =============================================================
   SECTION 13: TOP CUSTOMERS
   Fetches and logs the top customers by visit count or spend.
   (Currently logs to console — UI rendering can be added here)
   ============================================================= */

async function loadTopCustomers() {
  const data = await window.api.topCustomers();
  console.log(data);
}


/* =============================================================
   SECTION 14: SAVE VISIT
   Validates inputs, saves the customer record and visit to the
   database, optionally sends a WhatsApp summary, then resets
   the billing session.
   ============================================================= */

async function saveVisit() {
  const phone = phoneInput.value;
  const name = nameInput.value;

  // Validate: phone must be exactly 10 digits
  if (!/^\d{10}$/.test(phone)) {
    document.getElementById("status").innerText = "Enter valid 10-digit phone number";
    return;
  }

  if (!name) {
    document.getElementById("status").innerText = "Enter customer name";
    return;
  }

  // Upsert customer record (creates if new, updates if existing)
  await window.api.saveCustomer({ name, phone });

  // Save the visit with services list and total
  const res = await window.api.saveVisit({
  phone,
  services,
  total,
   paymentMode: appState.payment || "UPI",
  staff: appState.staff || "Senior"
});
  if (res.success) {
    document.getElementById("status").innerText = "Saved successfully!";

    // Refresh income summary on the dashboard
    loadIncome();

    // Optionally auto-send a WhatsApp summary if the toggle is checked
    const auto = document.getElementById("autoWhatsapp").checked;
    if (auto) {
      sendWhatsApp();
    }

    // Clear the status message after 2 seconds
    setTimeout(() => {
      document.getElementById("status").innerText = "";
    }, 2000);

    // Reset all billing session state and inputs
    phoneInput.value = "";
    nameInput.value = "";
    total = 0;
    services = [];
    document.getElementById("total").innerText = 0;

    // Return focus to phone field for the next customer
    setTimeout(() => {
      phoneInput.focus();
    }, 100);
  }
}


/* =============================================================
   SECTION 15: DATA MANAGEMENT — BACKUP, RESTORE, CLEAR, EXPORT
   Admin-level operations for data safety and reporting.
   ============================================================= */

// Trigger a backup of all salon data to a user-chosen location
async function backupData() {
  const res = await window.api.backupData();

  if (res.success) {
    document.getElementById("status").innerText = "Backup saved successfully!";
  } else {
    document.getElementById("status").innerText = "Backup canceled";
  }
}

// Restore data from a previously saved backup (overwrites current data)
async function restoreData() {
  const confirmRestore = confirm("This will overwrite current data. Continue?");

  if (!confirmRestore) return;

  const res = await window.api.restoreData();

  if (res.success) {
    document.getElementById("status").innerText = "Data restored! Restart app.";
  } else {
    document.getElementById("status").innerText = "Restore canceled or failed";
  }
}

// Permanently delete all data (customers, visits, services) after confirmation
async function clearData() {
  const confirmClear = confirm("Delete all data?");

  if (!confirmClear) return;

  const res = await window.api.clearData();

  if (res.success) {
    document.getElementById("status").innerText = "Data cleared!";

    // Refresh UI to reflect empty state
    loadCustomers();
    loadIncome();
  }
}

/*
  exportData() — disabled/reserved for future use
  async function exportData() {
    const res = await window.api.exportData();
    if (res.success) {
      document.getElementById("status").innerText = "Export successful!";
    } else {
      document.getElementById("status").innerText = "Export canceled or failed";
    }
  }
*/

// Export all visit records to a spreadsheet file
async function exportVisits() {
  const res = await window.api.exportVisits();

  if (res.success) {
    document.getElementById("status").innerText = "Visits exported!";
  } else {
    document.getElementById("status").innerText = "Export canceled or failed";
  }
}


/* =============================================================
   SECTION 16: REPORTS MODAL
   Handles the report download modal — allows selecting a date
   range (today / week / month / custom) and exporting data.
   ============================================================= */

// Open the report download modal
function openReportModal() {
  document.getElementById("reportModal").classList.add("open");
}

// Close the report download modal
function closeReportModal() {
  document.getElementById("reportModal").classList.remove("open");
}

// Show or hide custom date fields based on selected report type
function handleReportType() {
  const type = document.getElementById("reportType").value;
  const custom = document.getElementById("customDates");

  if (type === "custom") {
    custom.style.display = "block";
  } else {
    custom.style.display = "none";
  }
}

// Calculate the date range and trigger the report download
async function downloadReport() {
  const type = document.getElementById("reportType").value;

  let from = null;
  let to = null;

  const today = new Date();

  // Calculate from/to dates based on selected report period
  if (type === "today") {
    from = to = today.toISOString().split("T")[0];
  }

  if (type === "week") {
    const past = new Date();
    past.setDate(today.getDate() - 7);
    from = past.toISOString().split("T")[0];
    to = today.toISOString().split("T")[0];
  }

  if (type === "month") {
    from = today.toISOString().slice(0, 7) + "-01"; // First day of current month
    to = today.toISOString().split("T")[0];
  }

  if (type === "custom") {
    from = document.getElementById("reportFrom").value;
    to = document.getElementById("reportTo").value;
  }

  await window.api.exportReport({ from, to });

  alert("Report downloaded!");
  closeReportModal();
}

const adminPanel = document.getElementById("adminPanel");

document.getElementById("adminBtn").onclick = () => {
  adminPanel.classList.remove("hidden");
  loadDashboard(); // load stats when opened
};

document.getElementById("closeAdmin").onclick = () => {
  adminPanel.classList.add("hidden");
};

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {

    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));

    document.getElementById(btn.dataset.tab + "Tab").classList.remove("hidden");
  });
});

let paymentChart;

function renderPaymentChart(upi, cash) {
  const ctx = document.getElementById("paymentChart");

  if (paymentChart) {
    paymentChart.destroy(); // avoid duplicate chart
  }

  paymentChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["UPI", "Cash"],
      datasets: [{
        label: "Amount ₹",
        data: [upi, cash]
      }]
    },
    options: {
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderStaffLeaderboard(stats) {
  const container = document.getElementById("staffLeaderboard");
  container.innerHTML = "";

  const sorted = Object.entries(stats)
    .filter(([name]) => name !== "Unknown")
    .sort((a, b) => b[1] - a[1]);

  sorted.forEach(([name, amount], index) => {
    const row = document.createElement("div");

    row.className = "staff-row";

    row.innerHTML = `
      <span class="rank">#${index + 1}</span>
      <span class="name">${name}</span>
      <span class="amount">₹${amount}</span>
    `;

    container.appendChild(row);
  });
}

function animateValue(id, value) {
  const el = document.getElementById(id);
  const duration = 1200;
  const startTime = performance.now();

  const easeOut = t => 1 - Math.pow(1 - t, 3); // smooth finish

  function update(currentTime) {
    const raw = Math.min((currentTime - startTime) / duration, 1);
    const progress = easeOut(raw);

    const current = Math.floor(progress * value);
    el.innerText = `₹${current}`;

    if (raw < 1) {
      requestAnimationFrame(update);
    } else {
      el.innerText = `₹${value}`;
    }
  }

  requestAnimationFrame(update);
}
async function loadDashboard() {
  const data = await window.api.getDashboardStats();

  console.log("Dashboard Data:", data);

  // 👉 SET VALUES 
  animateValue("dashToday", data.today);
animateValue("dashWeek", data.week);
animateValue("dashMonth", data.month);
  // 👉 Chart
  renderPaymentChart(data.upi, data.cash);

  // 👉 Leaderboard
  renderStaffLeaderboard(data.staffStats);
}
/* =============================================================
   SECTION 17: MODAL & KEYBOARD CONTROLS
   Global listeners for closing modals via Escape key or
   clicking the modal backdrop.
   ============================================================= */

// Close service modal when clicking the backdrop (outside modal content)
document.addEventListener("click", (e) => {
  const box = document.getElementById("suggestionsBox");

  if (
    !phoneInput.contains(e.target) &&
    !box.contains(e.target)
  ) {
    box.style.display = "none";
  }
});



document.getElementById("adminPanel").addEventListener("click", (e) => {
  if (e.target.id === "adminPanel") {
    e.currentTarget.classList.add("hidden");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("adminPanel").classList.add("hidden");
  }
});

// Close service modal on Escape key press
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("serviceModal").classList.remove("open");
  }
});


/* =============================================================
   SECTION 18: APP INITIALIZATION
   Runs on page load — populates income stats, service buttons,
   and the admin service list.
   ============================================================= */

loadIncome();      // Load today / week / month income figures
loadServices();    // Render service buttons for billing
loadServices();    // Called twice intentionally (safe, no side effects)
loadServiceList(); // Render admin service list with edit/delete controls

/* =============================================================
   SECTION 19: MEN / WOMEN BILLING — GENDER + CATEGORY SYSTEM
   Added on top of original code. All original functions intact.
   ============================================================= */

const genderState = {
  gender:    'men',
  hairLen:   'Shoulder',
  activeCat: null,
  bill:      [],   // [{id, name, price}]
  billTotal: 0,
  allSvcs:   [],
};

// ── Switch gender tab ─────────────────────────────────────────
function switchGender(g, el) {
  genderState.gender    = g;
  genderState.activeCat = null;
  genderState.bill      = [];
  genderState.billTotal = 0;

  document.querySelectorAll('.gender-tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  const wrap = document.getElementById('hairLenWrap');
  if (g === 'women') wrap.classList.add('show');
  else               wrap.classList.remove('show');

  loadGenderServices();
}

// ── Hair length ───────────────────────────────────────────────
function setHairLen(el) {
  genderState.hairLen = el.dataset.len;
  document.querySelectorAll('.hl-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderSvcGrid();
}

// ── Load services for current gender ─────────────────────────
async function loadGenderServices() {
  const all = await window.api.getServicesByGender(genderState.gender);
  genderState.allSvcs = all;

  // Also rebuild serviceMap so repeatLastVisit() still works
  all.forEach(s => { serviceMap[s.name] = s.price; });

  renderCatTabs();
  renderSvcGrid();
}

// ── Category tabs ─────────────────────────────────────────────
function renderCatTabs() {
  const cats = [...new Set(genderState.allSvcs.map(s => s.category || 'General'))];
  if (!genderState.activeCat || !cats.includes(genderState.activeCat)) {
    genderState.activeCat = cats[0] || null;
  }
  const wrap = document.getElementById('catTabs');
  wrap.innerHTML = cats.map(c =>
    `<button class="cat-tab${c === genderState.activeCat ? ' active' : ''}"
       onclick="pickCat('${c.replace(/'/g,"\\'")}',this)">${c}</button>`
  ).join('');
}

function pickCat(cat, el) {
  genderState.activeCat = cat;
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderSvcGrid();
}

// ── Service grid ──────────────────────────────────────────────
function renderSvcGrid() {
  let svcs = genderState.allSvcs.filter(s =>
    (s.category || 'General') === genderState.activeCat
  );

  // For women: filter by hair length when variants exist
  if (genderState.gender === 'women') {
    const hasLenVariants = svcs.some(s =>
      s.name.includes('Shoulder') || s.name.includes('Mid-Back') || s.name.includes('Waist')
    );
    if (hasLenVariants) {
      const lenKey = genderState.hairLen;
      svcs = svcs.filter(s =>
        (!s.name.includes('Shoulder') && !s.name.includes('Mid-Back') && !s.name.includes('Waist'))
        || s.name.includes(lenKey)
      );
    }
  }

  const grid = document.getElementById('svcGrid');
  if (!svcs.length) {
    grid.innerHTML = '<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:20px 0;grid-column:1/-1;">No services in this category</div>';
    return;
  }

  function cleanName(n) {
    return n
      .replace(/^\[.\]\s*/, '')
      .replace(/\s*\((Shoulder|Mid-Back|Waist.*?)\)\s*$/, '');
  }

  grid.innerHTML = svcs.map(s => {
    const sel = genderState.bill.some(b => b.id === s.id);
    return `<button class="svc-btn${sel ? ' selected' : ''}"
      onclick="toggleSvcBtn(${s.id},'${s.name.replace(/'/g,"\\'")}',${s.price})">
      <span class="svc-check">✓</span>
      ${cleanName(s.name)}
      <span class="svc-price">₹${s.price.toLocaleString('en-IN')}</span>
    </button>`;
  }).join('');
}

// ── Toggle service in/out of bill ─────────────────────────────
function toggleSvcBtn(id, name, price) {
  const idx = genderState.bill.findIndex(b => b.id === id);
  if (idx > -1) {
    genderState.billTotal -= genderState.bill[idx].price;
    genderState.bill.splice(idx, 1);
    // also remove from legacy services array
    const li = services.indexOf(name);
    if (li > -1) { services.splice(li, 1); total -= price; }
  } else {
    genderState.bill.push({ id, name, price });
    genderState.billTotal += price;
    // also add to legacy services array so saveVisit() picks it up
    services.push(name);
    total += price;
  }
  // Update the legacy total display
  document.getElementById('total').innerText = total;
  renderSvcGrid();
}

// ── Admin: add service with gender+category ───────────────────
// Overrides the inline addAdminService() in index.html
async function addAdminService() {
  const name     = document.getElementById('adminServiceName').value.trim();
  const price    = document.getElementById('adminServicePrice').value.trim();
  const gender   = document.getElementById('adminServiceGender')?.value || 'men';
  const category = document.getElementById('adminServiceCat')?.value.trim() || 'General';

  if (!name || !price) { showStatus('Enter service name and price'); return; }

  await window.api.addService({ name, price: parseInt(price), gender, category });

  document.getElementById('adminServiceName').value  = '';
  document.getElementById('adminServicePrice').value = '';
  if (document.getElementById('adminServiceCat'))
    document.getElementById('adminServiceCat').value = '';

  loadAdminServiceList();
  loadGenderServices();
  loadServices(); // refresh legacy chips too
}

// ── Admin: service list with gender+category badges ───────────
let _allAdminSvcs = [];

async function loadAdminServiceList() {
  if (!window.api) return;
  _allAdminSvcs = await window.api.getServices();
  renderAdminSvcList(_allAdminSvcs);
}

function renderAdminSvcList(svcs) {
  const container = document.getElementById('adminServiceList');
  container.innerHTML = '';
  svcs.forEach(s => {
    const row = document.createElement('div');
    row.innerHTML = `
      <span class="svc-badge ${s.gender || 'men'}">${s.gender === 'women' ? 'W' : 'M'}</span>
      <span class="svc-badge cat">${s.category || 'General'}</span>
      <span style="flex:1;font-size:12px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.name}</span>
      <span style="font-size:11px;color:var(--text-dim);margin-right:4px;">₹</span>
      <input type="number" value="${s.price}" id="adminPrice-${s.id}"
        style="width:70px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;"
        onkeypress="if(event.key==='Enter') syncAndUpdate(${s.id})"
      />
      <button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;margin-left:6px;"
        onclick="syncAndUpdate(${s.id})">Update</button>
      <button class="btn btn-danger" style="padding:5px 10px;font-size:11px;margin-left:4px;"
        onclick="deleteServiceAndRefresh(${s.id})">Delete</button>
    `;
    container.appendChild(row);
  });
  if (!svcs.length) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:20px;">No services found</div>';
  }
}

function filterAdminSvcList() {
  const q = (document.getElementById('adminSvcSearch')?.value || '').toLowerCase();
  const g = document.getElementById('adminSvcGenderFilter')?.value || 'all';
  const filtered = _allAdminSvcs.filter(s => {
    const matchG = g === 'all' || s.gender === g;
    const matchQ = !q || s.name.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q);
    return matchG && matchQ;
  });
  renderAdminSvcList(filtered);
}

function syncAndUpdate(id) {
  const adminVal = document.getElementById('adminPrice-' + id);
  const origEl   = document.getElementById('price-' + id);
  if (origEl && adminVal) origEl.value = adminVal.value;
  updateServicePrice(id);
  setTimeout(() => { loadAdminServiceList(); loadGenderServices(); }, 300);
}

async function deleteServiceAndRefresh(id) {
  await deleteService(id);
  loadAdminServiceList();
  loadGenderServices();
}

// ── Boot the new system ───────────────────────────────────────
loadGenderServices();
