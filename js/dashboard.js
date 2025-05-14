// /js/dashboard.js
import { getProducts, getStockOperations, getSales } from './services/api.js';

// --- DOM Elements ---
// ... (keep all existing element variables) ...
const totalProductsEl = document.getElementById('total-products');
const stockAvailableEl = document.getElementById('stock-available');
const productsSoldEl = document.getElementById('products-sold');
const stockOperationsEl = document.getElementById('stock-operations');
const salesChartCanvas = document.getElementById('salesChart');
const salesChartLoadingEl = document.getElementById('sales-chart-loading');
const salesChartErrorEl = document.getElementById('sales-chart-error');
const productChartCanvas = document.getElementById('productStockChart');
const productChartLoadingEl = document.getElementById('product-chart-loading');
const productChartErrorEl = document.getElementById('product-chart-error');
const activityListEl = document.getElementById('recent-activity-list');
const activityLoadingEl = document.getElementById('activity-loading');
const activityErrorEl = document.getElementById('activity-error');


// --- Chart.js Instances ---
let salesChartInstance = null;
let productChartInstance = null;

// --- Chart Initialization Functions ---

function initializeSalesChart() {
    if (!salesChartCanvas) return null;
    const ctx = salesChartCanvas.getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Unités Vendues',
                data: [],
                backgroundColor: 'rgba(54, 162, 235, 0.7)', // Bootstrap Primary Blue
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top' }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label || ''}: ${ctx.parsed.y?.toLocaleString('fr-FR') || 0} unités` } } },
            scales: { y: { beginAtZero: true, ticks: { callback: val => val.toLocaleString('fr-FR') } }, x: { grid: { display: false } } },
            animation: { duration: 1000, easing: 'easeInOutQuad' }
        }
    });
}

function initializeProductChart() {
    if (!productChartCanvas) return null;
    const ctx = productChartCanvas.getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'En Stock',
                    data: [],
                    backgroundColor: 'rgba(40, 167, 69, 0.7)', // Bootstrap Success Green
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1,
                    borderRadius: 5,
                },
                {
                    label: 'Vendus',
                    data: [],
                    // *** COLOR CHANGE HERE ***
                    backgroundColor: 'rgba(54, 162, 235, 0.7)', // Use Bootstrap Primary Blue (same as Sales chart)
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    borderRadius: 5,
                }
            ]
        },
        options: { /* ... keep existing options ... */
             responsive: true, maintainAspectRatio: false, indexAxis: 'y', // Horizontal bars
            plugins: { legend: { display: true, position: 'top' }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label || ''}: ${ctx.parsed.x?.toLocaleString('fr-FR') || 0} unités` } } }, // Tooltips use 'x' for horizontal
            scales: { x: { beginAtZero: true, ticks: { callback: val => val.toLocaleString('fr-FR') } }, y: { grid: { display: false } } },
            animation: { duration: 1000, easing: 'easeInOutQuad' }
        }
    });
}


// --- Helper Functions ---
// ... (keep all existing helper functions: displayError, showOverlay, hideOverlay, formatNumber, formatDate) ...
function displayError(element, message = "Erreur") { if (element) element.innerHTML = `<span class="text-danger small p-1">${message}</span>`; }
function showOverlay(element) { if (element) element.classList.remove('d-none'); }
function hideOverlay(element) { if (element) element.classList.add('d-none'); }
function formatNumber(num) { return (typeof num === 'number' && !isNaN(num)) ? num.toLocaleString('fr-FR') : '--'; }
function formatDate(dateString) { if (!dateString) return "Date inconnue"; const date = new Date(dateString); return isNaN(date.getTime()) ? "Date invalide" : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });}


// --- Data Processing Functions ---
// ... (keep all existing data processing functions: calculateMonthlySales, prepareProductChartData, prepareRecentActivity, displayRecentActivity) ...
function calculateMonthlySales(sales) { const monthlySales = {}; if (!Array.isArray(sales)) return { labels: [], data: [] }; sales.forEach(sale => { try { if (!sale.date || !Array.isArray(sale.articles)) return; const saleDate = new Date(sale.date); if (isNaN(saleDate.getTime())) return; const monthKey = saleDate.toISOString().slice(0, 7); const totalQuantity = sale.articles.reduce((sum, art) => sum + (Number(art.quantity) || 0), 0); monthlySales[monthKey] = (monthlySales[monthKey] || 0) + totalQuantity; } catch (e) { console.error("Error processing sale:", sale, e); } }); const sortedMonths = Object.keys(monthlySales).sort(); const labels = sortedMonths.map(key => new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })); const data = sortedMonths.map(key => monthlySales[key]); return { labels, data }; }
function prepareProductChartData(products, count = 5) { if (!Array.isArray(products)) return { labels: [], stockData: [], soldData: [] }; const topProducts = products .map(p => ({ title: p.title || 'N/A', stock: Number(p.stock_available ?? p.stocks ?? 0) || 0, sells: Number(p.sells ?? 0) || 0, })) .sort((a, b) => b.stock - a.stock) .slice(0, count); const labels = topProducts.map(p => p.title); const stockData = topProducts.map(p => p.stock); const soldData = topProducts.map(p => p.sells); return { labels, stockData, soldData }; }
function prepareRecentActivity(stockOps, sales, limit = 5) { let combined = []; if (Array.isArray(stockOps)) { combined = combined.concat(stockOps.map(op => ({ type: 'stock', id: op._id, name: op.name || 'Fournisseur inconnu', date: op.date, quantity: Array.isArray(op.articles) ? op.articles.reduce((sum, art) => sum + (Number(art.quantity) || 0), 0) : 0, }))); } if (Array.isArray(sales)) { combined = combined.concat(sales.map(op => ({ type: 'sale', id: op._id, name: op.name || 'Client inconnu', date: op.date, quantity: Array.isArray(op.articles) ? op.articles.reduce((sum, art) => sum + (Number(art.quantity) || 0), 0) : 0, }))); } combined.sort((a, b) => { const dateA = new Date(a.date); const dateB = new Date(b.date); if (isNaN(dateA.getTime())) return 1; if (isNaN(dateB.getTime())) return -1; return dateB - dateA; }); return combined.slice(0, limit); }
function displayRecentActivity(activities) { if (!activityListEl) return; if (!Array.isArray(activities) || activities.length === 0) { activityListEl.innerHTML = '<li class="text-muted text-center p-3">Aucune activité récente à afficher.</li>'; return; } activityListEl.innerHTML = activities.map(act => { const iconClass = act.type === 'stock' ? 'fa-arrow-up text-success' : 'fa-arrow-down text-danger'; const typeText = act.type === 'stock' ? 'Arrivage' : 'Vente'; const quantityText = act.quantity > 0 ? `(${act.quantity} unités)` : ''; return `<li> <span class="activity-icon"><i class="fas ${iconClass}" title="${typeText}"></i></span> <div class="activity-details"> <div class="activity-name">${act.name} ${quantityText}</div> <div class="activity-date">${formatDate(act.date)}</div> </div> </li>`; }).join(''); }


// --- Main Data Loading and Processing ---
// ... (keep existing loadDashboardData function exactly as it was) ...
async function loadDashboardData() {
    // Show loading indicators
    totalProductsEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; stockAvailableEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; productsSoldEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; stockOperationsEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    showOverlay(salesChartLoadingEl); hideOverlay(salesChartErrorEl);
    showOverlay(productChartLoadingEl); hideOverlay(productChartErrorEl);
    showOverlay(activityLoadingEl); hideOverlay(activityErrorEl);
    activityListEl.innerHTML = '';

    // Clear previous chart data
    [salesChartInstance, productChartInstance].forEach(chart => { if (chart) { chart.data.labels = []; chart.data.datasets.forEach(ds => ds.data = []); chart.update(0); } });

    try {
        // Fetch all data concurrently
        const [products, stockOps, sales] = await Promise.all([ getProducts(), getStockOperations(), getSales() ]);

        // --- Process KPIs ---
        let totalProducts = 0, stockAvailable = 0, productsSoldCount = 0;
        if (Array.isArray(products)) { totalProducts = products.length; products.forEach(p => { stockAvailable += Number(p.stock_available ?? p.stocks ?? 0) || 0; productsSoldCount += Number(p.sells ?? 0) || 0; }); } else { throw new Error("Données produits invalides"); }
        const stockOperationsCount = Array.isArray(stockOps) ? stockOps.length : 0; if (!Array.isArray(stockOps) && stockOps !== null) { throw new Error("Données opérations stock invalides"); }
        const salesCount = Array.isArray(sales) ? sales.length : 0; if (!Array.isArray(sales) && sales !== null) { throw new Error("Données ventes invalides"); }

        // Update KPI Elements
        totalProductsEl.textContent = formatNumber(totalProducts); stockAvailableEl.textContent = `${formatNumber(stockAvailable)} `; productsSoldEl.textContent = `${formatNumber(productsSoldCount)} `; stockOperationsEl.textContent = formatNumber(stockOperationsCount);

        // --- Process Sales Chart ---
        const salesChartData = calculateMonthlySales(sales);
        if (salesChartInstance) { salesChartInstance.data.labels = salesChartData.labels; salesChartInstance.data.datasets[0].data = salesChartData.data; salesChartInstance.update(); hideOverlay(salesChartLoadingEl); } else { throw new Error("Erreur initialisation graphique ventes"); }

        // --- Process Product Chart ---
        const productChartData = prepareProductChartData(products);
        if (productChartInstance) { productChartInstance.data.labels = productChartData.labels; productChartInstance.data.datasets[0].data = productChartData.stockData; productChartInstance.data.datasets[1].data = productChartData.soldData; productChartInstance.update(); hideOverlay(productChartLoadingEl); } else { throw new Error("Erreur initialisation graphique produits"); }

        // --- Process Recent Activity ---
        const recentActivities = prepareRecentActivity(stockOps, sales);
        displayRecentActivity(recentActivities); hideOverlay(activityLoadingEl);

    } catch (error) {
        console.error("Failed to load dashboard data:", error);
        // Display errors in UI
        displayError(totalProductsEl, "Erreur"); displayError(stockAvailableEl, "Erreur"); displayError(productsSoldEl, "Erreur"); displayError(stockOperationsEl, "Erreur");
        showOverlay(salesChartErrorEl); hideOverlay(salesChartLoadingEl);
        showOverlay(productChartErrorEl); hideOverlay(productChartLoadingEl);
        showOverlay(activityErrorEl); hideOverlay(activityLoadingEl);
        activityListEl.innerHTML = '<li class="text-danger text-center p-3">Erreur chargement activité.</li>';
        Swal.fire({ icon: 'error', title: 'Oops...', text: `Impossible de charger les données du dashboard: ${error.message}`, });
    }
}


// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    salesChartInstance = initializeSalesChart();
    productChartInstance = initializeProductChart();
    loadDashboardData();
});
