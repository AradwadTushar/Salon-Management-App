const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // ── ORIGINAL (all preserved) ─────────────────────────────
  saveCustomer:      (data)  => ipcRenderer.invoke('save-customer', data),
  findCustomer:      (phone) => ipcRenderer.invoke('find-customer', phone),
  saveVisit:         (data)  => ipcRenderer.invoke('save-visit', data),
  getIncome:         ()      => ipcRenderer.invoke('get-income'),
  getLastVisit:      (phone) => ipcRenderer.invoke('get-last-visit', phone),
  getCustomers:      (filter)=> ipcRenderer.invoke('get-customers', filter),
  backupData:        ()      => ipcRenderer.invoke('backup-data'),
  restoreData:       ()      => ipcRenderer.invoke('restore-data'),
  clearData:         ()      => ipcRenderer.invoke('clear-data'),
  exportVisits:      ()      => ipcRenderer.invoke('export-visits'),
  getServices:       ()      => ipcRenderer.invoke('get-services'),
  addService:        (data)  => ipcRenderer.invoke('add-service', data),
  deleteService:     (id)    => ipcRenderer.invoke('delete-service', id),
  updateService:     (data)  => ipcRenderer.invoke('update-service', data),
  getVisitHistory:   (phone) => ipcRenderer.invoke('get-visit-history', phone),
  filterByDate:      (data)  => ipcRenderer.invoke('filter-by-date', data),
  exportReport:      (data)  => ipcRenderer.invoke('export-report', data),
  getDashboardStats: ()      => ipcRenderer.invoke('get-dashboard-stats'),
  topCustomers:      ()      => ipcRenderer.invoke('top-customers'),

  // ── NEW ──────────────────────────────────────────────────
  getServicesByGender: (gender) => ipcRenderer.invoke('get-services-by-gender', gender),
});
