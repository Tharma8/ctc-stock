import { getCurrentUser, logout } from '../services/authService.js';
import { fetchUserData } from '../services/userService.js';
import { setUserState, subscribeToUserState } from '../state/userState.js';
import { navigateTo, redirectToLogin } from './router.js';

const elements = {
  userDisplay: document.getElementById('userDisplay'),
  userBalance: document.getElementById('userBalance'),
  userProfit: document.getElementById('userProfit'),
  activeInvestments: document.getElementById('activeInvestments'),
  welcomeText: document.getElementById('welcomeText'),
  transactionHistory: document.getElementById('transactionHistory'),
  signOutButton: document.getElementById('signOutButton'),
  logoutBtn: document.getElementById('logoutBtn'),
};

const loadingOverlay = createLoadingOverlay();
const errorBanner = createErrorBanner();

function createLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'dashboardLoadingOverlay';
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-white/90 text-slate-900 font-semibold transition-opacity';
  overlay.innerHTML = '<div class="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">Loading dashboard...</div>';
  document.body.appendChild(overlay);
  return overlay;
}

function createErrorBanner() {
  const banner = document.createElement('div');
  banner.id = 'dashboardErrorBanner';
  banner.className = 'fixed top-4 left-1/2 z-50 hidden -translate-x-1/2 rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 shadow-lg';
  document.body.appendChild(banner);
  return banner;
}

function showLoading() {
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
  }
}

function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
  }
}

function showError(message) {
  if (!errorBanner) return;
  errorBanner.textContent = message;
  errorBanner.classList.remove('hidden');
}

function hideError() {
  if (!errorBanner) return;
  errorBanner.classList.add('hidden');
  errorBanner.textContent = '';
}

function formatCurrency(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderTransactionHistory(entries = []) {
  if (!elements.transactionHistory) return;
  elements.transactionHistory.innerHTML = '';

  if (!Array.isArray(entries) || entries.length === 0) {
    elements.transactionHistory.innerHTML = `
      <div class="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-600">
        <p class="text-base font-semibold">No transactions yet</p>
        <p class="mt-2 text-sm text-slate-500">Make your first deposit to start tracking your activity.</p>
      </div>
    `;
    return;
  }

  const list = document.createElement('div');
  list.className = 'space-y-3';

  entries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
    item.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="font-semibold text-slate-900">${entry.description || 'Transaction'}</p>
          <p class="text-xs text-slate-500">${entry.date || 'Pending'}</p>
        </div>
        <p class="font-semibold text-slate-900">${entry.amount ?? '$0.00'}</p>
      </div>
    `;
    list.appendChild(item);
  });

  elements.transactionHistory.appendChild(list);
}

function updateUI(user) {
  if (!user || !elements.userDisplay) return;

  const fullName = user.fullName || 'Investor';
  elements.userDisplay.textContent = fullName;
  elements.userBalance.textContent = formatCurrency(user.balance);
  elements.userProfit.textContent = formatCurrency(user.profit);
  elements.activeInvestments.textContent = String((user.investments?.length) || 0);
  elements.welcomeText.textContent = user.fullName ? `Welcome back, ${fullName}` : 'Welcome to CTC Capital';
  renderTransactionHistory(user.transactionHistory);
}

async function checkAuth() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      redirectToLogin();
      return null;
    }
    return currentUser;
  } catch (error) {
    console.error('Auth check failed:', error);
    redirectToLogin();
    return null;
  }
}

async function loadUserData() {
  showLoading();
  hideError();

  try {
    const currentUser = await checkAuth();
    if (!currentUser) return;

    const userData = await fetchUserData(currentUser.uid);
    if (!userData) {
      throw new Error('User data could not be loaded');
    }

    setUserState(userData);
  } catch (error) {
    console.error('Dashboard data load error:', error);
    showError('Unable to load dashboard data. Please refresh the page.');
  } finally {
    hideLoading();
  }
}

function bindEvents() {
  const logoutButtons = [elements.signOutButton, elements.logoutBtn].filter(Boolean);
  logoutButtons.forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await logout();
        redirectToLogin();
      } catch (error) {
        console.error('Logout failed:', error);
        showError('Unable to log out. Please try again.');
      }
    });
  });

  document.querySelectorAll('a[href^="../pages/"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const target = link.getAttribute('href');
      if (target) {
        navigateTo(target);
      }
    });
  });
}

function initDashboard() {
  subscribeToUserState(updateUI);
  bindEvents();
  loadUserData();
}

initDashboard();
