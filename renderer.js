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


/* =============================================================
   SECTION 2: DOM REFERENCES
   Cached references to frequently used input elements.
   ============================================================= */

const phoneInput = document.getElementById("phone");
const nameInput = document.getElementById("name");


/* =============================================================
   SECTION 3: PHONE INPUT — VALIDATION & AUTOCOMPLETE
   - Strips non-numeric characters as the user types
   - Shows a live dropdown of matching customers based on phone
   - Clicking a suggestion auto-fills both phone and name fields
   ============================================================= */

// Strip any non-digit characters from the phone field in real time
phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, "");
});

// Show autocomplete suggestions as the user types a phone number
phoneInput.addEventListener("input", async () => {
  const phone = phoneInput.value;
  const box = document.getElementById("suggestionsBox");

  // Don't show suggestions for very short input (< 2 digits)
  if (phone.length < 2) {
    box.style.display = "none";
    return;
  }

  // Fetch all customers and filter by partial phone match
  const customers = await window.api.getCustomers("all");
  const matches = customers.filter(c => c.phone.includes(phone));

  box.innerHTML = "";

  // Hide the dropdown if no matches found
  if (matches.length === 0) {
    box.style.display = "none";
    return;
  }

  // Build a dropdown item for each matching customer
  matches.forEach(c => {
    const item = document.createElement("div");

    item.innerText = `${c.name} (${c.phone})`;
    item.style.padding = "6px";
    item.style.cursor = "pointer";

    // Use mousedown (not click) so it fires before the input's blur event,
    // preventing the dropdown from closing before selection is registered
    item.onmousedown = () => {
      phoneInput.value = c.phone;
      nameInput.value = c.name;

      box.style.display = "none";

      // Trigger blur so last-visit info is fetched automatically
      phoneInput.dispatchEvent(new Event("blur"));
    };

    // Highlight row on hover
    item.onmouseover = () => item.style.background = "#eee";
    item.onmouseout = () => item.style.background = "white";

    box.appendChild(item);
  });

  box.style.display = "block";
});

// Close the suggestions dropdown when clicking anywhere outside the phone input
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
  <small style="color:gray;">${new Date(v.date).toLocaleDateString()}</small>
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
  const res = await window.api.saveVisit({ phone, services, total });

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


/* =============================================================
   SECTION 17: MODAL & KEYBOARD CONTROLS
   Global listeners for closing modals via Escape key or
   clicking the modal backdrop.
   ============================================================= */

// Close service modal when clicking the backdrop (outside modal content)
window.addEventListener("click", (e) => {
  const modal = document.getElementById("serviceModal");

  if (e.target === modal) {
    modal.classList.remove("open");
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