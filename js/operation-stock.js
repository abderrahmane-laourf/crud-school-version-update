import { getStockOperations, addStockOperation, getProducts, deleteStockOperationById, getStockOperationDetails } from './services/api.js';

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return "Date invalide";
    }
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function displayErrorInTable(message) {
    const tableBody = document.getElementById('productList');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${message}</td></tr>`;
    } else {
        console.error("Element with ID 'productList' not found for displaying error.");
    }
}

let allStockOperations = [];

function populateStockTable(operations) {
    const tableBody = document.getElementById('productList');
    if (!tableBody) {
        console.error("Table body 'productList' not found.");
        return;
    }
    if (!operations || operations.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Aucune opération à afficher.</td></tr>`;
        return;
    }

    tableBody.innerHTML = operations.map((operation, index) => {
        const formattedDate = formatDate(operation.date);
        const totalQuantity = Array.isArray(operation.articles)
            ? operation.articles.reduce((sum, article) => sum + (article.quantity || 0), 0)
            : 0;
        return `
      <tr>
        <td>${index + 1}</td>
        <td>${operation.name || 'N/A'}</td>
        <td>${formattedDate}</td>
        <td>${totalQuantity} unités</td>
        <td class="text-center">
          <button class="btn btn-light btn-sm me-1 show-btn" onclick="showOperation('${operation._id}')" title="Voir Détails">
             <i class="fa fa-eye"></i>
          </button>
          <button class="btn btn-light btn-sm delete-btn" onclick="deleteOperation('${operation._id}')" title="Supprimer">
            <i class="fa fa-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
}

async function loadStockData() {
    try {
        const operations = await getStockOperations();
        if (operations) {
            allStockOperations = operations;
            populateStockTable(allStockOperations);
        } else {
            allStockOperations = [];
            displayErrorInTable("Impossible de charger les opérations (données vides reçues).");
        }
    } catch (error) {
        allStockOperations = [];
        console.error("Erreur f loadStockData:", error);
        displayErrorInTable("Erreur lors du chargement: " + error.message);
    }
}

async function populateProductSelect() {
    try {
        const products = await getProducts();
        const productSelect = document.getElementById('productSelect');
        if (!productSelect) return;

        productSelect.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.value = "";
        defaultOption.textContent = 'Choisir un Produit';
        productSelect.appendChild(defaultOption);

        if (products && products.length > 0) {
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product._id;
                option.textContent = product.title;
                productSelect.appendChild(option);
            });
        } else {
            defaultOption.textContent = 'Aucun produit disponible';
            productSelect.disabled = true;
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des produits:", error);
        const productSelect = document.getElementById('productSelect');
        if (productSelect) {
            productSelect.innerHTML = '<option selected disabled>Erreur chargement produits</option>';
            productSelect.disabled = true;
        }
    }
}

function addProductToForm(productId, productName, quantity) {
    const container = document.getElementById('productListContainer');
    if (!container) return;

    const emptyMsg = document.getElementById('emptyProductListMsg');
    if(emptyMsg) emptyMsg.style.display = 'none'; // Hide empty message

    const existingRow = Array.from(container.querySelectorAll('.d-flex')).find(row => { // More specific selector
        const idInput = row.querySelector('.product-id');
        return idInput && idInput.value === productId;
    });

    if (existingRow) {
        const qtySpan = existingRow.querySelector('.quantity');
        const currentQtyText = qtySpan.textContent || '0 unités';
        const currentQty = parseInt(currentQtyText.split(' ')[0]) || 0;
        const newQty = currentQty + quantity;
        qtySpan.textContent = `${newQty} unités`;
    } else {
        const row = document.createElement('div');
        row.classList.add('d-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'p-2', 'border', 'rounded', 'bg-white'); // Added bg-white
        row.innerHTML = `
      <div class="flex-grow-1 me-2">
        <input type="hidden" value="${productId}" class="product-id">
        <span class="product-name fw-bold">${productName}</span>
      </div>
      <div class="text-nowrap me-3">
        <span class="quantity">${quantity} unités</span>
      </div>
      <div>
        <button type="button" class="btn btn-outline-danger btn-sm remove-product" title="Retirer produit">
          <i class="fa fa-times"></i>
        </button>
      </div>
    `;
        row.querySelector('.remove-product').addEventListener('click', () => {
             row.remove();
             // Check if container is empty after removal
             if (container.querySelectorAll('.d-flex').length === 0 && emptyMsg) {
                 emptyMsg.style.display = 'block';
             }
        });
        container.appendChild(row);
    }
}


async function handleSubmitStockOperation(event) {
    event.preventDefault();

    const nameInput = document.getElementById('modalSupplierInput');
    const dateInput = document.getElementById('modalDateInput');
    const productContainer = document.getElementById('productListContainer');

    if (!nameInput || !dateInput || !productContainer) {
         console.error("Form elements missing");
         Swal.fire('Erreur', 'Impossible de trouver les éléments du formulaire.', 'error');
         return;
    }

    const name = nameInput.value.trim();
    const date = dateInput.value;

    if (!name) {
        Swal.fire('Erreur', 'Veuillez saisir le nom du fournisseur.', 'error');
        return;
    }
    if (!date) {
         Swal.fire('Erreur', 'Veuillez sélectionner une date.', 'error');
        return;
    }

    const productRows = productContainer.querySelectorAll('.d-flex');

    const articles = Array.from(productRows).map(row => {
        const productIdInput = row.querySelector('.product-id');
        const quantitySpan = row.querySelector('.quantity');

        if (!productIdInput || !quantitySpan) return null;

        const productId = productIdInput.value;
        const quantityText = quantitySpan.textContent || '0 unités';
        const quantity = parseInt(quantityText.split(' ')[0]) || 0;

        if (!productId || quantity <= 0) {
            console.warn("Skipping invalid article:", { productId, quantityText });
            return null;
        }

        return { product: productId, quantity: quantity };
    }).filter(article => article !== null);

    if (articles.length === 0) {
        Swal.fire('Erreur', 'Veuillez ajouter au moins un produit valide avec une quantité supérieure à zéro.', 'error');
        return;
    }

    const newOperation = { name, date, articles };

    const submitButton = document.getElementById('enregistrerStock'); // Use specific ID
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enregistrement...'; // Loading state
    }


    try {
        const result = await addStockOperation(newOperation);

        if (result && result._id) {
            nameInput.value = '';
            dateInput.value = ''; // Reset date as well
            productContainer.innerHTML = ''; // Clear list visually
            const emptyMsg = document.getElementById('emptyProductListMsg'); // Show empty message again
            if(emptyMsg) emptyMsg.style.display = 'block';
            document.getElementById('productSelect').selectedIndex = 0;
            document.getElementById('quantityInput').value = '';

            const modalElement = document.getElementById('newOperationModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }

            Swal.fire('Succès', 'Opération ajoutée avec succès !', 'success');
            await loadStockData();
        } else {
            Swal.fire('Erreur', 'Échec de l\'ajout de l\'opération. Réponse inattendue de l\'API.', 'error');
        }
    } catch (error) {
        console.error("Erreur handleSubmitStockOperation:", error);
        Swal.fire('Erreur', `Une erreur est survenue: ${error.message}`, 'error');
    } finally {
         if (submitButton) {
             submitButton.disabled = false;
             submitButton.innerHTML = 'Enregistrer l\'Opération'; // Reset button text
         }
    }
}

async function showOperation(operationId) {
    if (!operationId) {
        console.error("showOperation called with invalid ID:", operationId);
        return;
    }
    try {
        // Prefill modal while loading
        document.getElementById('viewSupplierName').textContent = 'Chargement...';
        document.getElementById('viewOperationDate').textContent = 'Chargement...';
        document.getElementById('viewProductList').innerHTML = '<p class="text-center text-muted">Chargement des produits...</p>';

        // Show the modal immediately
        const modalElement = document.getElementById('viewStockDetailsModal');
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.show();

        // Fetch data
        const operationDetails = await getStockOperationDetails(operationId);

        // Populate modal with fetched data
        if (operationDetails && operationDetails.name && operationDetails.date && Array.isArray(operationDetails.articles)) {
            document.getElementById('viewSupplierName').textContent = operationDetails.name;
            document.getElementById('viewOperationDate').textContent = formatDate(operationDetails.date);

            const productListContainer = document.getElementById('viewProductList');
            if (!productListContainer) return;

            if (operationDetails.articles.length > 0) {
                productListContainer.innerHTML = operationDetails.articles.map(article => {
                     const productName = article.product && article.product.title ? article.product.title : 'Produit inconnu';
                     const quantity = article.quantity || 0;
                     return `
                        <div class="d-flex justify-content-between mb-2 p-2 border-bottom">
                           <span class="fw-medium">${productName}</span>
                           <span>${quantity} unités</span>
                        </div>`;
                }).join('');
            } else {
                productListContainer.innerHTML = '<p class="text-center text-muted">Aucun produit dans cette opération.</p>';
            }

        } else {
             console.error("Invalid operation details received:", operationDetails);
             // Keep modal open but show error inside
             document.getElementById('viewSupplierName').textContent = 'Erreur';
             document.getElementById('viewOperationDate').textContent = 'Erreur';
             document.getElementById('viewProductList').innerHTML = '<p class="text-center text-danger">Impossible de charger les détails.</p>';
             // Optionally show a Swal alert as well
             // Swal.fire('Erreur', 'Données de l\'opération invalides ou incomplètes.', 'error');
        }
    } catch (error) {
        console.error("Erreur showOperation:", error);
         // Show error in modal
        document.getElementById('viewSupplierName').textContent = 'Erreur';
        document.getElementById('viewOperationDate').textContent = 'Erreur';
        document.getElementById('viewProductList').innerHTML = `<p class="text-center text-danger">Erreur: ${error.message}</p>`;
        // Keep the modal open to show the error, or optionally hide it and show Swal
        // modalInstance.hide(); // Uncomment this if you prefer hiding modal on error
        Swal.fire('Erreur', `Impossible de charger les détails: ${error.message}`, 'error');
    }
}


async function deleteOperation(operationId) {
    if (!operationId) {
        console.error("deleteOperation called with invalid ID:", operationId);
        return;
    }
    try {
        const confirmation = await Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: 'Cette opération sera définitivement supprimée. Cette action est irréversible.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d', // Secondary color
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        });

        if (confirmation.isConfirmed) {
            Swal.fire({ // Show loading state immediately
                title: 'Suppression en cours...',
                text: 'Veuillez patienter.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading()
                }
            });

            const result = await deleteStockOperationById(operationId);

            if (result) { // Assuming API returns truthy on success
                Swal.close(); // Close loading Swal
                await Swal.fire( // Show success message
                    'Supprimé !',
                    'L\'opération a été supprimée avec succès.',
                    'success'
                );
                allStockOperations = allStockOperations.filter(op => op._id !== operationId);
                filterOperations();
            } else {
                 Swal.fire('Erreur', 'Impossible de supprimer l\'opération (échec côté serveur).', 'error');
            }
        }
    } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        Swal.fire('Erreur', `Une erreur technique est survenue lors de la suppression: ${error.message}`, 'error');
    }
}

function filterOperations() {
    const searchInput = document.getElementById('searchSupplier');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase().trim();

    const filteredOperations = allStockOperations.filter(operation =>
        operation.name && operation.name.toLowerCase().includes(searchTerm)
    );

    populateStockTable(filteredOperations);

    if (filteredOperations.length === 0 && searchTerm !== '') {
        const tableBody = document.getElementById('productList');
         if (tableBody) {
             tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-3">Aucune opération trouvée pour "${searchInput.value}".</td></tr>`;
         }
    } else if (filteredOperations.length === 0 && allStockOperations.length > 0) {
         // Handles case where search is empty but table was empty due to previous filter
         populateStockTable(allStockOperations);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    populateProductSelect();
    loadStockData();

    const addProductButton = document.getElementById('Ajouter-produit');
    if (addProductButton) {
        addProductButton.addEventListener('click', () => {
            const productSelect = document.getElementById('productSelect');
            const quantityInput = document.getElementById('quantityInput');

            if (!productSelect || !quantityInput) return;

            const selectedOption = productSelect.selectedOptions[0];
            const selectedProductId = selectedOption ? selectedOption.value : null;
            const selectedProductName = selectedOption ? selectedOption.textContent : '';
            const quantity = parseInt(quantityInput.value);

            if (!selectedProductId || productSelect.selectedIndex === 0) {
                Swal.fire('Attention', 'Veuillez sélectionner un produit.', 'warning');
                return;
            }

            if (isNaN(quantity) || quantity <= 0) {
                Swal.fire('Attention', 'Veuillez entrer une quantité numérique valide supérieure à zéro.', 'warning');
                quantityInput.focus();
                return;
            }

            addProductToForm(selectedProductId, selectedProductName, quantity);

            productSelect.selectedIndex = 0;
            quantityInput.value = '';
        });
    } else {
        console.warn("Button with ID 'Ajouter-produit' not found.");
    }

    const stockForm = document.getElementById('newStockOpForm');
    if (stockForm) {
        stockForm.addEventListener('submit', handleSubmitStockOperation);
    } else {
        console.warn("Form with ID 'newStockOpForm' not found.");
    }

    const searchInput = document.getElementById('searchSupplier');
    const searchButton = searchInput ? searchInput.nextElementSibling : null;

    if (searchInput) {
        searchInput.addEventListener('input', filterOperations);
        // Clear search on Escape key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                filterOperations();
            }
        });
    } else {
        console.warn("Search input with ID 'searchSupplier' not found.");
    }

    if (searchButton) {
        // Allow explicit search click as well
        searchButton.addEventListener('click', filterOperations);
    }

    // Add listener for modal close to reset form state if needed (optional)
    const newOperationModal = document.getElementById('newOperationModal');
    if (newOperationModal) {
        newOperationModal.addEventListener('hidden.bs.modal', event => {
            // Optional: Reset parts of the form if desired when closed without saving
            // e.g., document.getElementById('newStockOpForm').reset(); // Resets native form elements
             document.getElementById('productListContainer').innerHTML = '<p class="text-center text-muted" id="emptyProductListMsg">Aucun produit ajouté pour le moment.</p>'; // Clear list
             document.getElementById('productSelect').selectedIndex = 0;
             document.getElementById('quantityInput').value = '';
             // Reset submit button state in case of errors
             const submitButton = document.getElementById('enregistrerStock');
             if (submitButton) {
                 submitButton.disabled = false;
                 submitButton.innerHTML = 'Enregistrer l\'Opération';
             }
        })
    }
    const cancelStockBtn = document.getElementById('annulerstock');
if (cancelStockBtn) {
    cancelStockBtn.addEventListener('click', () => {
        // Clear input fields
        document.getElementById('modalSupplierInput').value = '';
        document.getElementById('modalDateInput').value = '';
        document.getElementById('quantityInput').value = '';
        document.getElementById('productSelect').selectedIndex = 0;

        // Clear product list
        const container = document.getElementById('productListContainer');
        if (container) {
            container.innerHTML = '<p class="text-center text-muted" id="emptyProductListMsg">Aucun produit ajouté pour le moment.</p>';
        }

        // Reset submit button just in case
        const submitButton = document.getElementById('enregistrerStock');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Enregistrer l\'Opération';
        }
    });
} else {
    console.warn("Cancel button with ID 'cancelStockBtn' not found.");
}

  window.showOperation = showOperation;
window.deleteOperation = deleteOperation;

});
