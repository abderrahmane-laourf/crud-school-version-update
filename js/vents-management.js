import { getSales, addSale, getSaleDetails, deleteSale, getProducts } from './services/api.js';

// --- Helper Functions ---

function formatDate(dateString) {
    if (!dateString) return "Date inconnue";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return "Date invalide";
    }
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return date.toLocaleDateString('fr-FR', options);
}

function displayErrorInTable(message, tableBodyId = 'productList') {
    const tableBody = document.getElementById(tableBodyId);
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger p-3">${message}</td></tr>`;
    } else {
        console.error(`Element with ID '${tableBodyId}' not found for displaying error.`);
    }
}

// --- Global State ---
let allSalesData = [];

// --- DOM Manipulation ---

function populateSalesTable(sales) {
    const tableBody = document.getElementById('productList');
    if (!tableBody) {
        console.error("Table body 'productList' not found.");
        return;
    }

    if (!sales || sales.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-3">Aucune vente à afficher.</td></tr>`;
        return;
    }

    tableBody.innerHTML = sales.map((sale, index) => {
        const formattedDate = formatDate(sale.date);
        const productCount = Array.isArray(sale.articles) ? sale.articles.length : 0;
        const actualSaleId = sale._id || '';

        return `
      <tr>
        <td>${index + 1}</td>
        <td>${sale.name || 'N/A'}</td>
        <td>${formattedDate}</td>
        <td>${productCount} article${productCount !== 1 ? 's' : ''}</td>
        <td class="text-center">
          <button class="btn btn-light btn-sm me-1 show-sale-btn" onclick="showSaleDetails('${actualSaleId}')" title="Voir Détails" ${!actualSaleId ? 'disabled' : ''}>
             <i class="fa fa-eye"></i>
          </button>
          <button class="btn btn-light btn-sm delete-sale-btn" onclick="confirmDeleteSale('${actualSaleId}')" title="Supprimer" ${!actualSaleId ? 'disabled' : ''}>
            <i class="fa fa-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
}

// --- Data Loading ---

async function loadSalesData() {
    const tableBody = document.getElementById('productList');
    if(tableBody) {
         tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-5"><span class="spinner-border spinner-border-sm"></span> Chargement...</td></tr>`;
    }
    try {
        const sales = await getSales();
        if (sales) {
            allSalesData = sales;
            populateSalesTable(allSalesData);
        } else {
            allSalesData = [];
            displayErrorInTable("Impossible de charger les ventes (données vides reçues).");
        }
    } catch (error) {
        allSalesData = [];
        console.error("Erreur f loadSalesData:", error);
        displayErrorInTable("Erreur lors du chargement des ventes: " + (error.message || 'Erreur inconnue'));
    }
}

async function populateProductSelect() {
    const productSelect = document.getElementById('saleProductSelect');
    if (!productSelect) {
         console.warn("Element select '#saleProductSelect' not found in modal.");
         return;
    }
    productSelect.disabled = true;

    try {
        const products = await getProducts();

        productSelect.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.value = "";
        defaultOption.textContent = 'Choisir un Produit...';
        productSelect.appendChild(defaultOption);

        if (products && products.length > 0) {
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product._id;
                option.textContent = product.title;
                productSelect.appendChild(option);
            });
            productSelect.disabled = false;
        } else {
            defaultOption.textContent = 'Aucun produit disponible';
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des produits:", error);
        if (productSelect) {
            productSelect.innerHTML = '<option selected disabled value="">Erreur chargement produits</option>';
        }
    }
}

// --- Add Sale Modal Logic ---

function addProductToSaleForm(productId, productName, quantity) {
    const container = document.getElementById('saleProductListContainer');
    if (!container) {
        console.error("Container '#saleProductListContainer' not found in modal.");
        return;
    }

    const emptyMsg = container.querySelector('.text-muted');
    if (emptyMsg) emptyMsg.remove();

    const existingRow = Array.from(container.querySelectorAll('.sale-product-item')).find(row => row.dataset.productId === productId);

    if (existingRow) {
        const qtySpan = existingRow.querySelector('.quantity-value');
        const currentQty = parseInt(qtySpan.textContent) || 0;
        const newQty = currentQty + quantity;
        qtySpan.textContent = newQty;
        existingRow.dataset.quantity = newQty;
    } else {
        const row = document.createElement('div');
        row.classList.add('d-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'p-2', 'border', 'rounded', 'bg-white', 'sale-product-item');
        row.dataset.productId = productId;
        row.dataset.quantity = quantity;

        row.innerHTML = `
          <div class="flex-grow-1 me-2">
            <span class="product-name fw-bold">${productName}</span>
          </div>
          <div class="text-nowrap me-3">
            <span class="rounded-pill"><span class="quantity-value">${quantity}</span> unités</span>
          </div>
          <div>
            <button type="button" class="btn btn-outline-danger btn-sm remove-sale-product" title="Retirer produit">
              <i class="fa fa-times"></i>
            </button>
          </div>
        `;
        row.querySelector('.remove-sale-product').addEventListener('click', () => {
             row.remove();
             if (container.querySelectorAll('.sale-product-item').length === 0) {
                 container.innerHTML = '<p class="text-center text-muted">Aucun produit ajouté pour le moment.</p>';
             }
        });
        container.appendChild(row);
    }
}

function getProductsFromSaleFormList() {
    const container = document.getElementById('saleProductListContainer');
    if (!container) return [];

    const productRows = container.querySelectorAll('.sale-product-item');
    const articles = [];

    productRows.forEach(row => {
        const productId = row.dataset.productId;
        const quantity = parseInt(row.dataset.quantity, 10);

        if (productId && !isNaN(quantity) && quantity > 0) {
             articles.push({ product: productId, quantity: quantity });
        }
    });
    return articles;
}


// --- Form Submission ---

async function handleSubmitSaleOperation(event) {
    event.preventDefault();

    const clientInput = document.getElementById('modalClientInput');
    const dateInput = document.getElementById('modalDeliveryDateInput');
    const submitButton = document.querySelector('#newSaleModal .modal-footer button[type="submit"]');

    if (!clientInput || !dateInput) {
         console.error("Form elements (client, date) missing");
         Swal.fire('Erreur', 'Impossible de trouver les champs client ou date.', 'error');
         return;
    }

    const clientName = clientInput.value.trim();
    const deliveryDate = dateInput.value;
    const articles = getProductsFromSaleFormList();

    if (!clientName) {
        Swal.fire('Erreur de validation', 'Veuillez saisir le nom du client.', 'warning');
        return;
    }
    // Makayn lach n validiw date ila kanet fixa
    // if (!deliveryDate) {
    //      Swal.fire('Erreur de validation', 'Veuillez sélectionner une date de livraison.', 'warning');
    //     return;
    // }
    if (articles.length === 0) {
        Swal.fire('Erreur de validation', 'Veuillez ajouter au moins un produit valide à la vente.', 'warning');
        return;
    }

    const newSaleData = {
        name: clientName,
        date: deliveryDate, // Kayakhod date fixa
        articles: articles
    };

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enregistrement...';
    }

    try {
        const result = await addSale(newSaleData);

        if (result && result._id) {
            // Reset ghir client w liste, date la hit fixa w readOnly
            document.getElementById('modalClientInput').value = '';
            const container = document.getElementById('saleProductListContainer');
            if (container) container.innerHTML = '<p class="text-center text-muted">Aucun produit ajouté pour le moment.</p>';

            const modalElement = document.getElementById('newSaleModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }

            Swal.fire('Succès!', 'Vente ajoutée avec succès.', 'success');
            await loadSalesData();
        } else {
            // Hadi ghaliban maghatbanch m3a throw f api.js, mais nkhlliwha احتياط
            Swal.fire('Erreur', 'Échec de l\'ajout de la vente. Réponse inattendue de l\'API.', 'error');
        }
    } catch (error) {
        // *** HNA FIN KAYN T7SIN DYAL MESSAGE D'ERREUR ***
        console.error("Erreur handleSubmitSaleOperation:", error);

        // Checkiw wach message fih kelmet "stock" awla "insuffisant"
        const isStockError = error.message &&
                             (error.message.toLowerCase().includes('stock') ||
                              error.message.toLowerCase().includes('insuffisant'));

        // Nbeddlo title 3la 7sab wach error dyal stock wla la
        const errorTitle = isStockError ? 'Stock Insuffisant' : 'Erreur d\'Ajout';

        // N affichiw l message li ja men API direct f text dyal Swal
        Swal.fire({
            icon: 'error',
            title: errorTitle, // Title wḍeḥ
            text: error.message || 'Une erreur inconnue est survenue lors de l\'ajout.', // Message exacte mn API
            // Nzidoh indication ila kan mochkil dyal stock
            footer: isStockError ? 'Veuillez vérifier la quantité ou le stock disponible.' : undefined
        });
        // *** FIN DYAL T7SIN ***
    } finally {
         if (submitButton) {
             submitButton.disabled = false;
             submitButton.innerHTML = 'Enregistrer Vente';
         }
    }
}

// --- View/Delete Actions (Exposed Globally) ---

async function showSaleDetails(saleId) {
    if (!saleId) {
        console.error("showSaleDetails called with invalid ID:", saleId);
        return;
    }

    const modalBody = document.querySelector('#viewSaleDetailsModal .modal-body');
    const modalTitle = document.getElementById('viewSaleDetailsModalLabel');
    if (!modalBody || !modalTitle) {
        console.error("Modal elements for viewSaleDetailsModal not found.");
        return;
    }

    modalBody.innerHTML = '<div class="text-center p-5"><span class="spinner-border spinner-border-sm"></span> Chargement...</div>';

    const modalElement = document.getElementById('viewSaleDetailsModal');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();

    try {
        const saleDetails = await getSaleDetails(saleId);

        if (saleDetails && saleDetails.name && saleDetails.date && Array.isArray(saleDetails.articles)) {
             const client = saleDetails.name;
             const date = formatDate(saleDetails.date);
             const productsHtml = saleDetails.articles.length > 0
                ? saleDetails.articles.map(article => {
                    const productName = article.product && article.product.title ? article.product.title : 'Produit Inconnu/Supprimé';
                    const quantity = article.quantity || 0;
                    return `
                        <div class="d-flex justify-content-between align-items-center mb-2 ps-1 border-bottom pb-1">
                           <span class="fw-medium">${productName}</span>
                           <span class=" me-3">${quantity} unités</span>
                        </div>`;
                 }).join('')
                : '<p class="text-center text-muted">Aucun article dans cette vente.</p>';

            modalBody.innerHTML = `
                <div class="row mb-3">
                    <div class="col-md-6"><label class="form-label fw-bold">Client</label><div class="form-control-plaintext">${client}</div></div>
                    <div class="col-md-6"><label class="form-label fw-bold">Date Livraison</label><div class="form-control-plaintext">${date}</div></div>
                </div>
                <hr>
                <h6 class="fw-bold mb-3">Articles Vendus</h6>
                <div>${productsHtml}</div>
            `;
        } else {
             console.error("Invalid sale details received:", saleDetails);
             modalBody.innerHTML = '<p class="text-center text-danger">Impossible de charger les détails (données invalides).</p>';
        }
    } catch (error) {
        console.error("Erreur showSaleDetails:", error);
        modalBody.innerHTML = `<p class="text-center text-danger">Erreur lors du chargement: ${error.message || 'Erreur inconnue'}</p>`;
    }
}

async function confirmDeleteSale(saleId) {
    if (!saleId) {
        console.error("confirmDeleteSale called with invalid ID:", saleId);
        return;
    }

    const confirmation = await Swal.fire({
        title: 'Êtes-vous sûr(e) ?',
        text: "Cette vente sera supprimée définitivement.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Oui, supprimer !',
        cancelButtonText: 'Annuler'
    });

    if (confirmation.isConfirmed) {
        Swal.fire({
            title: 'Suppression en cours...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading() }
        });

        try {
            const success = await deleteSale(saleId);

            if (success) {
                Swal.close();
                await Swal.fire('Supprimé !', 'La vente a été supprimée.', 'success');
                // Mzyan n filtrer l data globale direct
                allSalesData = allSalesData.filter(sale => sale._id !== saleId);
                // W n 3awdo n affichiw b filter (li ghay affichi data li bqat)
                filterSales();
            } else {
                 // Hadi tqder tbqa hit deleteSale daba kat rejje3 false f catch dyalha f api.js
                 Swal.fire('Erreur', 'Impossible de supprimer la vente (échec API).', 'error');
            }
        } catch (error) {
            // Hadi normalement maghatched walo daba hit deleteSale kat rejje3 false
            console.error("Erreur lors de la suppression de la vente:", error);
            Swal.fire('Erreur', `Une erreur technique est survenue: ${error.message || 'Erreur inconnue'}`, 'error');
        }
    }
}

// --- Filtering ---

function filterSales() {
    const searchInput = document.getElementById('searchClient');
    const tableBody = document.getElementById('productList');
    if (!searchInput || !tableBody) {
        console.warn("Search input or table body not found for filtering.");
        return;
    }

    const searchTerm = searchInput.value.toLowerCase().trim();
    // Kan filtrer mn allSalesData dima
    const filteredSales = allSalesData.filter(sale =>
        sale.name && sale.name.toLowerCase().includes(searchTerm)
    );

    // Kan 3yto l populateSalesTable b data li filtrina
    populateSalesTable(filteredSales);

    // Affichage dyal message "Aucun résultat" ila l filtre machi khawi w mal9a walo
    if (filteredSales.length === 0 && searchTerm !== '') {
         tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-3">Aucune vente trouvée pour "${searchInput.value}".</td></tr>`;
    }
    // Makayn lach ndiro else if hna hit populateSalesTable kat handle l case dyal tableau khawi
}

// --- DOMContentLoaded Event Listener ---

document.addEventListener('DOMContentLoaded', () => {

    populateProductSelect();
    loadSalesData();

    const addProductButton = document.getElementById('Ajouter-produit');
    if (addProductButton) {
        addProductButton.addEventListener('click', () => {
            const productSelect = document.getElementById('saleProductSelect');
            const quantityInput = document.getElementById('saleQuantityInput');
            if (!productSelect || !quantityInput) return;

            const selectedOption = productSelect.selectedOptions[0];
            const productId = selectedOption ? selectedOption.value : null;
            const productName = selectedOption ? selectedOption.textContent : '';
            const quantity = parseInt(quantityInput.value);

            if (!productId || productId === "") {
                Swal.fire('Attention', 'Veuillez sélectionner un produit.', 'warning'); return;
            }
            if (isNaN(quantity) || quantity <= 0) {
                Swal.fire('Attention', 'Veuillez entrer une quantité valide (> 0).', 'warning'); quantityInput.focus(); return;
            }

            addProductToSaleForm(productId, productName, quantity);

            productSelect.selectedIndex = 0;
            quantityInput.value = '';
        });
    } else {
        console.warn("Button 'Ajouter-produit' not found.");
    }

    const saleForm = document.getElementById('newSaleForm');
    if (saleForm) {
        saleForm.addEventListener('submit', handleSubmitSaleOperation);
    } else {
        console.warn("Form 'newSaleForm' not found.");
    }

    const searchInput = document.getElementById('searchClient');
    const searchButton = searchInput ? searchInput.nextElementSibling : null;

    if (searchInput) {
        searchInput.addEventListener('input', filterSales);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { searchInput.value = ''; filterSales(); }
        });
    } else {
        console.warn("Search input 'searchClient' not found.");
    }
    if (searchButton && searchButton.tagName === 'BUTTON') {
        searchButton.addEventListener('click', filterSales);
    }

    const newSaleModalEl = document.getElementById('newSaleModal');
    if (newSaleModalEl) {
        newSaleModalEl.addEventListener('hidden.bs.modal', () => {
             // Reset ghir client w liste, date la hit fixa/readOnly
             document.getElementById('modalClientInput').value = ''; // Reset client
             const container = document.getElementById('saleProductListContainer');
             if(container) container.innerHTML = '<p class="text-center text-muted">Aucun produit ajouté pour le moment.</p>';

             const submitButton = document.querySelector('#newSaleModal .modal-footer button[type="submit"]');
             if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = 'Enregistrer Vente'; }
             
        });
    }

    // Kan rendiw functions globales bach ykhdmo onclick
    window.showSaleDetails = showSaleDetails;
    window.confirmDeleteSale = confirmDeleteSale;

});
