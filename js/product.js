import { getProducts, addProduct, updateProduct, deleteProduct } from './services/api.js';

const productTableBody = document.getElementById('productList');
const newProductForm = document.getElementById('newProductForm');
const newProductTitleInput = document.getElementById('newProductTitleInput');
const editProductForm = document.getElementById('editProductForm');
const editProductTitleInput = document.getElementById('editProductTitleInput');
const editProductModalEl = document.getElementById('editProductModal');
const newProductModalEl = document.getElementById('newProductModal');
const editProductModal = new bootstrap.Modal(editProductModalEl);
const searchInput = document.getElementById('search');

let currentEditProductId = null;
let allProducts = [];

function displayProducts(products) {
    if (!productTableBody) return;
    productTableBody.innerHTML = '';

    if (!products || products.length === 0) {
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        productTableBody.innerHTML = searchTerm
            ? `<tr><td colspan="5" class="text-center">Aucun produit ne correspond à "${searchTerm}".</td></tr>`
            : '<tr><td colspan="5" class="text-center">Aucun produit à afficher.</td></tr>';
        return;
    }

    products.forEach((product, index) => {
        const row = `
            <tr>
                <th scope="row">${index + 1}</th>
                <td>${product.title}</td>
                <td>${product.stock_available ?? product.stocks ?? 0} unités</td>
                <td>${product.sells ?? 0} unités</td>
                <td class="text-center">
                    <button class="btn btn-light btn-sm me-1 edit-btn" title="Modifier" data-product-id="${product._id}" data-product-title="${product.title}">
                        <i class="fa fa-pen"></i>
                    </button>
                    <button class="btn btn-light btn-sm delete-btn" title="Supprimer" data-product-id="${product._id}" data-product-title="${product.title}">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        productTableBody.innerHTML += row;
    });

    addTableButtonListeners();
}

async function loadAndDisplayProducts() {
    if (productTableBody) {
        productTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Chargement des produits...</td></tr>';
    }
    try {
        const products = await getProducts();
        if (products) {
            allProducts = products;
            filterAndDisplayProducts();
        } else {
            allProducts = [];
            if (productTableBody) {
                productTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Échec du chargement des produits (API). Veuillez réessayer.</td></tr>';
            }
        }
    } catch (error) {
        allProducts = [];
        if (productTableBody) {
            productTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Une erreur est survenue. Veuillez réessayer.</td></tr>';
        }
    }
}

function filterAndDisplayProducts() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filteredProducts = searchTerm
        ? allProducts.filter(product => product.title.toLowerCase().includes(searchTerm))
        : allProducts;
    displayProducts(filteredProducts);
}

if (newProductForm) {
    newProductForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const title = newProductTitleInput.value.trim();
        if (!title) {
            Swal.fire('Erreur', 'Veuillez saisir le titre du produit.', 'error');
            return;
        }
        const newProductData = { title: title };
        const result = await addProduct(newProductData);
        if (result) {
            await loadAndDisplayProducts();
            newProductTitleInput.value = '';
            const newProductModalInstance = bootstrap.Modal.getInstance(newProductModalEl);
            if (newProductModalInstance) newProductModalInstance.hide();
            Swal.fire('Succès', 'Produit ajouté !', 'success');
        } else {
            Swal.fire('Erreur', "L'ajout du produit a échoué.", 'error');
        }
    });
}

if (editProductForm) {
    editProductForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const newTitle = editProductTitleInput.value.trim();
        if (!newTitle) {
            Swal.fire('Erreur', 'Veuillez saisir le titre du produit.', 'error');
            return;
        }
        if (!currentEditProductId) {
            Swal.fire('Erreur', 'Aucun produit sélectionné pour modification.', 'error');
            return;
        }
        const updatedData = { title: newTitle };
        const result = await updateProduct(currentEditProductId, updatedData);
        if (result) {
            await loadAndDisplayProducts();
            editProductModal.hide();
            currentEditProductId = null;
            Swal.fire('Succès', 'Produit modifié !', 'success');
        } else {
            Swal.fire('Erreur', 'La modification du produit a échoué.', 'error');
        }
    });
}

function addTableButtonListeners() {
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const targetButton = event.currentTarget;
            currentEditProductId = targetButton.getAttribute('data-product-id');
            const currentTitle = targetButton.getAttribute('data-product-title');
            editProductTitleInput.value = currentTitle;
            editProductModal.show();
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const targetButton = event.currentTarget;
            const productId = targetButton.getAttribute('data-product-id');
            const productTitle = targetButton.getAttribute('data-product-title');

            Swal.fire({
                title: 'Êtes-vous sûr ?',
                text: `Vous êtes sur le point de supprimer le produit "${productTitle}". Cette action est irréversible !`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Oui, supprimer !',
                cancelButtonText: 'Annuler'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    Swal.showLoading();
                    const success = await deleteProduct(productId);
                    if (success) {
                        await loadAndDisplayProducts();
                        Swal.fire('Supprimé !', `Le produit "${productTitle}" a été supprimé.`, 'success');
                    } else {
                        Swal.fire('Erreur !', `La suppression du produit "${productTitle}" a échoué.`, 'error');
                    }
                }
            });
        });
    });
}

// Clear input when modals are closed
if (newProductModalEl) {
    newProductModalEl.addEventListener('hidden.bs.modal', () => {
        newProductTitleInput.value = '';
    });
}

if (editProductModalEl) {
    editProductModalEl.addEventListener('hidden.bs.modal', () => {
        editProductTitleInput.value = '';
        currentEditProductId = null;
    });
}

if (searchInput) {
    searchInput.addEventListener('input', () => {
        filterAndDisplayProducts();
    });
}

document.addEventListener('DOMContentLoaded', loadAndDisplayProducts);
