
// Application State
const state = {
  products: [],
  filters: {
    search: '',
    category: 'all',
    sort: 'newest'
  },
  editMode: false,
  editingProductId: null,
  deletingProductId: null
};

// API Base URL
const API_URL = '/api/products';

// DOM Elements
const elements = {
  loadingOverlay: document.getElementById('loading-overlay'),
  toastContainer: document.getElementById('toast-container'),
  
  // Stats
  valTotalProducts: document.getElementById('val-total-products'),
  valTotalStock: document.getElementById('val-total-stock'),
  valLowStock: document.getElementById('val-low-stock'),
  
  // Form
  productForm: document.getElementById('product-form'),
  formTitle: document.getElementById('form-title'),
  formSubtitle: document.getElementById('form-subtitle'),
  productIdInput: document.getElementById('product-id'),
  productNameInput: document.getElementById('product-name'),
  productCategorySelect: document.getElementById('product-category'),
  productBrandInput: document.getElementById('product-brand'),
  productPriceInput: document.getElementById('product-price'),
  productQuantityInput: document.getElementById('product-quantity'),
  productDescriptionInput: document.getElementById('product-description'),
  btnSubmit: document.getElementById('btn-submit'),
  btnCancel: document.getElementById('btn-cancel'),
  
  // Controls
  searchInput: document.getElementById('search-input'),
  filterCategory: document.getElementById('filter-category'),
  sortPrice: document.getElementById('sort-price'),
  
  // Table
  productsTbody: document.getElementById('products-tbody'),
  
  // Delete Modal
  deleteModal: document.getElementById('delete-modal'),
  deleteProductName: document.getElementById('delete-product-name'),
  btnConfirmDelete: document.getElementById('btn-confirm-delete'),
  btnCancelDelete: document.getElementById('btn-cancel-delete'),
  modalClose: document.getElementById('modal-close')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadInventory();
});

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Form Submit & Cancel
  elements.productForm.addEventListener('submit', handleFormSubmit);
  elements.btnCancel.addEventListener('click', resetForm);
  
  // Search, Filter, Sort
  elements.searchInput.addEventListener('input', debounce(handleSearchInput, 300));
  elements.filterCategory.addEventListener('change', handleFilterChange);
  elements.sortPrice.addEventListener('change', handleSortChange);
  
  // Close Modal
  elements.btnCancelDelete.addEventListener('click', closeDeleteModal);
  elements.modalClose.addEventListener('click', closeDeleteModal);
  elements.btnConfirmDelete.addEventListener('click', handleConfirmDelete);
  
  // Close modal on background click
  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) closeDeleteModal();
  });
}

// --- CORE OPERATIONS (CRUD) ---

// READ - Fetch products from the REST API
async function loadInventory() {
  showLoader(true);
  try {
    const { search, category, sort } = state.filters;
    
    // Construct query parameters
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category && category !== 'all') params.append('category', category);
    if (sort) params.append('sort', sort);
    
    const response = await fetch(`${API_URL}?${params.toString()}`);
    const resData = await response.json();
    
    if (!response.ok) {
      throw new Error(resData.message || 'Failed to fetch inventory.');
    }
    
    state.products = resData.data;
    renderProducts(state.products);
    updateStatsDashboard(state.products);
    
  } catch (error) {
    showToast('Error', error.message || 'Could not load inventory.', 'error');
  } finally {
    showLoader(false);
  }
}

// CREATE / UPDATE - Save product details
async function handleFormSubmit(e) {
  e.preventDefault();
  
  // 1. Client-Side Validation
  const isValid = validateProductForm();
  if (!isValid) {
    showToast('Validation Error', 'Please check the form inputs.', 'error');
    return;
  }
  
  // 2. Gather data
  const productData = {
    name: elements.productNameInput.value.trim(),
    category: elements.productCategorySelect.value,
    brand: elements.productBrandInput.value.trim(),
    price: parseFloat(elements.productPriceInput.value),
    quantity: parseInt(elements.productQuantityInput.value, 10),
    description: elements.productDescriptionInput.value.trim()
  };
  
  showLoader(true);
  try {
    let response;
    let successMessage;
    
    if (state.editMode && state.editingProductId) {
      // Update Mode (PUT)
      response = await fetch(`${API_URL}/${state.editingProductId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      successMessage = 'Product updated successfully!';
    } else {
      // Create Mode (POST)
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      successMessage = 'Product created successfully!';
    }
    
    const resData = await response.json();
    
    if (response.ok) {
      showToast('Success', successMessage, 'success');
      resetForm();
      await loadInventory();
    } else {
      // Server-side validation or other errors
      if (resData.errors && Array.isArray(resData.errors)) {
        displayServerErrors(resData.errors);
        showToast('Server Validation Error', 'Please check inputs.', 'error');
      } else {
        showToast('Error', resData.message || 'Operation failed.', 'error');
      }
    }
  } catch (error) {
    showToast('Error', error.message || 'Network error occurred.', 'error');
  } finally {
    showLoader(false);
  }
}

// DELETE - Perform database delete
async function handleConfirmDelete() {
  const idToDelete = state.deletingProductId;
  if (!idToDelete) return;
  
  showLoader(true);
  closeDeleteModal();
  
  try {
    const response = await fetch(`${API_URL}/${idToDelete}`, {
      method: 'DELETE'
    });
    
    const resData = await response.json();
    
    if (response.ok) {
      showToast('Success', 'Product deleted successfully.', 'success');
      await loadInventory();
    } else {
      showToast('Error', resData.message || 'Failed to delete product.', 'error');
    }
  } catch (error) {
    showToast('Error', error.message || 'Network error occurred.', 'error');
  } finally {
    showLoader(false);
    state.deletingProductId = null;
  }
}

// --- UI EDIT MODE HANDLER ---
function startEditMode(product) {
  state.editMode = true;
  state.editingProductId = product._id;
  
  // Populate form fields
  elements.productIdInput.value = product._id;
  elements.productNameInput.value = product.name;
  elements.productCategorySelect.value = product.category;
  elements.productBrandInput.value = product.brand;
  elements.productPriceInput.value = product.price;
  elements.productQuantityInput.value = product.quantity;
  elements.productDescriptionInput.value = product.description || '';
  
  // Toggle forms visuals
  elements.formTitle.textContent = 'Edit Product';
  elements.formSubtitle.textContent = `Modifying details of: ${product.name}`;
  elements.btnSubmit.textContent = 'Update Product';
  elements.btnCancel.classList.remove('hidden');
  
  // Clean validation states
  clearValidationStates();
  
  // Scroll to form on small viewports
  elements.productForm.scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  state.editMode = false;
  state.editingProductId = null;
  
  elements.productForm.reset();
  elements.productIdInput.value = '';
  
  elements.formTitle.textContent = 'Add New Product';
  elements.formSubtitle.textContent = 'Enter details to catalog a new device';
  elements.btnSubmit.textContent = 'Save Product';
  elements.btnCancel.classList.add('hidden');
  
  clearValidationStates();
}

// --- DELETE MODAL HANDLERS ---
function openDeleteModal(id, name) {
  state.deletingProductId = id;
  elements.deleteProductName.textContent = name;
  elements.deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  elements.deleteModal.classList.add('hidden');
  state.deletingProductId = null;
}

// --- CLIENT VALIDATION LOGIC ---
function validateProductForm() {
  let isValid = true;
  clearValidationStates();
  
  const name = elements.productNameInput.value.trim();
  const category = elements.productCategorySelect.value;
  const brand = elements.productBrandInput.value.trim();
  const price = elements.productPriceInput.value;
  const quantity = elements.productQuantityInput.value;
  
  // Name Validation
  if (!name) {
    setError('product-name', 'Product name is required');
    isValid = false;
  } else if (name.length < 2) {
    setError('product-name', 'Product name must be at least 2 characters long');
    isValid = false;
  }
  
  // Category Validation
  if (!category) {
    setError('product-category', 'Please select a category');
    isValid = false;
  }
  
  // Brand Validation
  if (!brand) {
    setError('product-brand', 'Brand is required');
    isValid = false;
  }
  
  // Price Validation
  if (price === '') {
    setError('product-price', 'Price is required');
    isValid = false;
  } else {
    const numPrice = Number(price);
    if (isNaN(numPrice)) {
      setError('product-price', 'Price must be a number');
      isValid = false;
    } else if (numPrice < 0) {
      setError('product-price', 'Price cannot be negative');
      isValid = false;
    }
  }
  
  // Quantity Validation
  if (quantity === '') {
    setError('product-quantity', 'Quantity is required');
    isValid = false;
  } else {
    const numQuantity = Number(quantity);
    if (isNaN(numQuantity)) {
      setError('product-quantity', 'Quantity must be a number');
      isValid = false;
    } else if (numQuantity < 0) {
      setError('product-quantity', 'Quantity cannot be negative');
      isValid = false;
    } else if (!Number.isInteger(numQuantity)) {
      setError('product-quantity', 'Quantity must be a whole number');
      isValid = false;
    }
  }
  
  return isValid;
}

// Set visual validation error
function setError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const feedback = document.getElementById(`err-${fieldId}`);
  if (input) input.classList.add('is-invalid');
  if (feedback) feedback.textContent = message;
}

// Clear all inputs invalid bounds styling
function clearValidationStates() {
  const inputs = ['product-name', 'product-category', 'product-brand', 'product-price', 'product-quantity', 'product-description'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    const feedback = document.getElementById(`err-${id}`);
    if (input) input.classList.remove('is-invalid');
    if (feedback) feedback.textContent = '';
  });
}

// Maps server validation constraints to form fields
function displayServerErrors(errors) {
  errors.forEach(err => {
    const lowerErr = err.toLowerCase();
    if (lowerErr.includes('name')) setError('product-name', err);
    else if (lowerErr.includes('category')) setError('product-category', err);
    else if (lowerErr.includes('brand')) setError('product-brand', err);
    else if (lowerErr.includes('price')) setError('product-price', err);
    else if (lowerErr.includes('quantity')) setError('product-quantity', err);
    else showToast('Validation Error', err, 'error');
  });
}

// --- RENDER FUNCTIONS ---
function renderProducts(products) {
  elements.productsTbody.innerHTML = '';
  
  if (products.length === 0) {
    elements.productsTbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          No electronics found matching your filters.
        </td>
      </tr>
    `;
    return;
  }
  
  products.forEach(product => {
    const tr = document.createElement('tr');
    
    // Formatting date
    const dateStr = new Date(product.createdDate).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    // Formatting price
    const priceStr = `$${parseFloat(product.price).toFixed(2)}`;
    
    // Low stock pill
    let stockBadge = '';
    if (product.quantity === 0) {
      stockBadge = `<span class="badge badge-out-of-stock">Out of Stock</span>`;
    } else if (product.quantity < 5) {
      stockBadge = `<span class="badge badge-low-stock">Low Stock (${product.quantity})</span>`;
    } else {
      stockBadge = `<span class="badge badge-in-stock">${product.quantity} units</span>`;
    }
    
    tr.innerHTML = `
      <td>
        <strong style="display: block;">${escapeHTML(product.name)}</strong>
        <small style="color: var(--text-muted);">${escapeHTML(product.description || '')}</small>
      </td>
      <td><span style="font-weight: 500;">${escapeHTML(product.category)}</span></td>
      <td>${escapeHTML(product.brand)}</td>
      <td style="font-family: var(--font-display); font-weight: 600;">${priceStr}</td>
      <td>${stockBadge}</td>
      <td style="color: var(--text-muted); font-size: 0.9rem;">${dateStr}</td>
      <td class="text-right">
        <button class="action-btn edit-btn" title="Edit Product">✏️</button>
        <button class="action-btn delete-btn" title="Delete Product">🗑️</button>
      </td>
    `;
    
    // Attaching dynamic listeners to row buttons
    tr.querySelector('.edit-btn').addEventListener('click', () => startEditMode(product));
    tr.querySelector('.delete-btn').addEventListener('click', () => openDeleteModal(product._id, product.name));
    
    elements.productsTbody.appendChild(tr);
  });
}

function updateStatsDashboard(products) {
  const totalProducts = products.length;
  const totalStock = products.reduce((acc, p) => acc + p.quantity, 0);
  const lowStockCount = products.filter(p => p.quantity < 5).length;
  
  elements.valTotalProducts.textContent = totalProducts;
  elements.valTotalStock.textContent = totalStock;
  elements.valLowStock.textContent = lowStockCount;
}

// --- UTILITY CONTROLS (DEBOUNCE / LOADERS) ---

function handleSearchInput(e) {
  state.filters.search = e.target.value.trim();
  loadInventory();
}

function handleFilterChange(e) {
  state.filters.category = e.target.value;
  loadInventory();
}

function handleSortChange(e) {
  state.filters.sort = e.target.value;
  loadInventory();
}

function showLoader(show) {
  if (show) {
    elements.loadingOverlay.classList.remove('hidden');
  } else {
    elements.loadingOverlay.classList.add('hidden');
  }
}

// Debounce helper to prevent excessive api hitting on search keystrokes
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Toast Alert Generator
function showToast(title, message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;
  
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  });
  
  elements.toastContainer.appendChild(toast);
  
  // Auto remove toast after 4.5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4500);
}

// HTML Sanitize utility
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
