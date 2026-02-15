'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  getStoreState,
  getCurrentMerchant,
  removeCheckout,
  upsertCheckout,
  updateCheckoutStatus,
} from '../../lib/hotpay-store';
import { TOKENS, shortAddress } from '../../lib/checkout-engine';
import { buildHotPayCheckoutUrl } from '../../lib/hotpay-adapter';

const PAYMENT_METHODS = Object.values(TOKENS).map((token) => token.symbol);

const NEW_CHECKOUT = {
  id: '',
  name: '',
  description: '',
  priceMode: 'fixed',
  fixedAmount: '24.00',
  variableMin: '5.00',
  variableMax: '120.00',
  acceptedPaymentMethods: ['ETH', 'USDC'],
  redirectUrl: '',
  webhookUrl: '',
  metadataJson: '{}',
  settlementAsset: 'usdc',
  hotpayItemId: '',
  memoPrefix: 'order',
  status: 'active',
};

const QR_BASE = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=';

function safeMoney(value, fallback = '0') {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
    style: 'currency',
    currency: 'USD',
  });
}

function sanitizeMethods(rawMethods = []) {
  const unique = rawMethods.filter((method, index, all) => all.indexOf(method) === index);
  return unique.length > 0 ? unique : ['ETH'];
}

function formatAmount(amount = 0) {
  const value = Number(amount);
  return `$${Number.isFinite(value) ? value.toFixed(2) : '0.00'}`;
}

function copyText(value, onSuccess, onFail) {
  if (!value) {
    onFail();
    return;
  }

  return navigator.clipboard
    .writeText(value)
    .then(() => onSuccess())
    .catch(() => onFail());
}

function formatRouteAmount(amount = 0) {
  return safeMoney(amount);
}

function toTxnTime(value) {
  if (!value) {
    return '—';
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }

  return d.toLocaleString();
}

export default function DashboardPage() {
  const [merchant, setMerchant] = useState(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [form, setForm] = useState(NEW_CHECKOUT);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [editingId, setEditingId] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [copiedWallet, setCopiedWallet] = useState(false);

  useEffect(() => {
    const current = getCurrentMerchant();
    if (current) {
      setMerchant(current);
    }

    setBaseUrl(window.location.origin);
    const state = getStoreState();
    const active = state.merchants.find((item) => item.id === state.currentMerchantId) || null;
    if (active) {
      setMerchant(active);
    }
  }, []);

  const transactions = merchant?.transactions || [];
  const checkouts = merchant?.checkouts || [];

  const totalPayments = transactions.length;
  const successful = transactions.filter((item) => item.status === 'confirmed' || item.status === 'success').length;
  const pending = transactions.filter((item) => item.status === 'pending').length;
  const failed = transactions.filter((item) => item.status === 'failed').length;
  const activeCheckoutLinks = checkouts.filter((item) => item.status === 'active').length;

  const merchantShort = useMemo(() => shortAddress(merchant?.walletAddress || ''), [merchant]);

  const filteredTransactions = useMemo(() => {
    if (historyFilter === 'all') {
      return transactions;
    }
    return transactions.filter((item) => item.checkoutId === historyFilter);
  }, [historyFilter, transactions]);

  const checkoutLink = (id) => `${baseUrl}/checkout/${id}`;

  const onCheckoutFieldChange = (event) => {
    const { name, value, checked, type } = event.target;

    if (type === 'checkbox') {
      const currentMethods = form.acceptedPaymentMethods.includes(value)
        ? form.acceptedPaymentMethods.filter((method) => method !== value)
        : [...form.acceptedPaymentMethods, value];

      setForm((current) => ({
        ...current,
        acceptedPaymentMethods: currentMethods,
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const onResetForm = () => {
    setForm(NEW_CHECKOUT);
    setEditingId('');
    setHistoryFilter('all');
  };

  const onSaveCheckout = () => {
    if (!merchant) {
      return;
    }

    if (!form.name.trim()) {
      alert('Add a product name.');
      return;
    }

    const amountMode = form.priceMode === 'fixed' ? 'fixed' : 'variable';
    const fixedAmount = amountMode === 'fixed' ? Number(form.fixedAmount) : Number(form.variableMin);

    if (!Number.isFinite(fixedAmount) || Number(form.fixedAmount) < 0.5) {
      alert('Set a valid amount.');
      return;
    }

    const payload = {
      ...form,
      priceMode: amountMode,
      id: editingId || '',
      acceptedPaymentMethods: sanitizeMethods(form.acceptedPaymentMethods),
      fixedAmount: amountMode === 'fixed' ? Number(form.fixedAmount).toFixed(2) : null,
      variableMin: amountMode === 'variable' ? Number(form.variableMin).toFixed(2) : null,
      variableMax: amountMode === 'variable' ? Number(form.variableMax).toFixed(2) : null,
      settlementAsset: form.settlementAsset || 'usdc',
      hotpayItemId: form.hotpayItemId?.trim() || '',
      memoPrefix: form.memoPrefix?.trim() || '',
      updatedAt: new Date().toISOString(),
    };

    upsertCheckout(merchant.id, payload);
    setMerchant(getCurrentMerchant(getStoreState()));
    setCopyStatus('checkout-saved');
    setTimeout(() => setCopyStatus(''), 1200);
    onResetForm();
  };

  const onEditCheckout = (item) => {
    setEditingId(item.id);
    setForm({
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      priceMode: item.priceMode || 'fixed',
      fixedAmount: Number(item.fixedAmount || 0).toFixed(2),
      variableMin: Number(item.variableMin || 0).toFixed(2),
      variableMax: Number(item.variableMax || 0).toFixed(2),
      acceptedPaymentMethods: Array.isArray(item.acceptedPaymentMethods)
        ? item.acceptedPaymentMethods
        : ['ETH', 'USDC'],
      redirectUrl: item.redirectUrl || '',
      webhookUrl: item.webhookUrl || '',
      metadataJson: item.metadataJson || '{}',
      settlementAsset: item.settlementAsset || 'usdc',
      hotpayItemId: item.hotpayItemId || '',
      memoPrefix: item.memoPrefix || 'order',
      status: item.status || 'active',
    });

    setHistoryFilter(item.id);
  };

  const onDeleteCheckout = (id) => {
    if (!merchant || !window.confirm('Delete this checkout page?')) {
      return;
    }

    const { removed } = removeCheckout(merchant.id, id);
    if (removed) {
      setMerchant(getCurrentMerchant(getStoreState()));
      if (editingId === id) {
        onResetForm();
      }
      if (historyFilter === id) {
        setHistoryFilter('all');
      }
    }
  };

  const onToggleStatus = (id, nextStatus) => {
    if (!merchant) {
      return;
    }

    updateCheckoutStatus(merchant.id, id, nextStatus);
    setMerchant(getCurrentMerchant(getStoreState()));
  };

  const getCheckoutLinks = (item) => {
    const amount = item.priceMode === 'fixed' ? item.fixedAmount : item.variableMin;
    return {
      app: checkoutLink(item.id),
      hotpay: buildHotPayCheckoutUrl({
        hotpayItemId: item.hotpayItemId,
        amount,
        currency: (item.settlementAsset || 'USDC').toUpperCase(),
        redirectUrl: item.redirectUrl,
        memoData: `${item.memoPrefix || 'order'}-${item.id}`,
      }),
    };
  };

  const copyWithStatus = async (kind, value) => {
    if (!value) {
      setCopyStatus(`${kind}:error`);
      setTimeout(() => setCopyStatus(''), 1300);
      return;
    }

    try {
      await copyText(
        value,
        () => {
          setCopyStatus(kind);
          setTimeout(() => setCopyStatus(''), 1300);
        },
        () => {
          setCopyStatus(`${kind}:error`);
          setTimeout(() => setCopyStatus(''), 1300);
        },
      );
    } catch {
      setCopyStatus(`${kind}:error`);
      setTimeout(() => setCopyStatus(''), 1300);
    }
  };

  const copyWalletAddress = async () => {
    if (!merchant?.walletAddress) {
      return;
    }

    try {
      await copyText(
        merchant.walletAddress,
        () => {
          setCopiedWallet(true);
          setTimeout(() => setCopiedWallet(false), 1300);
        },
        () => {
          setCopiedWallet(false);
        },
      );
    } catch {
      setCopiedWallet(false);
    }
  };

  const isReady = Boolean(merchant);

  if (!isReady) {
    return (
      <main className="app-shell">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Monitor payments, manage checkout links, and track settlements.</p>
        </header>

        <section className="panel">
          <header>
            <h2>No Merchant Session</h2>
            <p className="role-note">Register your wallet first to access merchant controls.</p>
          </header>
          <Link href="/register" className="action-primary" style={{ width: 'auto' }}>
            Register as Merchant
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell dashboard-page">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Monitor payments, manage checkout links, and track settlements.</p>
      </header>

      <section className="panel dashboard-section">
        <h2 className="section-title">ACCOUNT OVERVIEW</h2>

        <div className="kpi-grid">
          <article className="kpi">
            <h3>Total Payments</h3>
            <p>{totalPayments}</p>
          </article>
          <article className="kpi">
            <h3>Success</h3>
            <p>{successful}</p>
          </article>
          <article className="kpi">
            <h3>Pending</h3>
            <p>{pending}</p>
          </article>
          <article className="kpi">
            <h3>Failed</h3>
            <p>{failed}</p>
          </article>
        </div>

        <div className="kpi-grid dashboard-secondary-metrics">
          <article className="kpi">
            <h3>Active Checkout Links</h3>
            <p>{activeCheckoutLinks}</p>
          </article>
          <article className="kpi">
            <h3>Total Settled</h3>
            <p>{safeMoney(merchant.totalSettledUsd || 0)}</p>
          </article>
          <article className="kpi">
            <h3>Wallet Address</h3>
            <div className="inline-copy">
              <p>{merchantShort || shortAddress(merchant.walletAddress)}</p>
              <button className="small" onClick={copyWalletAddress}>
                {copiedWallet ? 'Copied' : 'Copy'}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="panel dashboard-section">
        <h2 className="section-title">CHECKOUT MANAGEMENT</h2>

        <div className="dashboard-layout-two-col">
          <section className="panel checkout-form-panel">
            <h3>Create / Edit Checkout</h3>

            <div className="form-compact-group">
              <h4 className="group-title">Basic Info</h4>
              <div className="form-grid">
                <div className="field-group">
                  <label>Product / service name</label>
                  <input name="name" value={form.name} onChange={onCheckoutFieldChange} />
                </div>
                <div className="field-group">
                  <label>Description</label>
                  <input name="description" value={form.description} onChange={onCheckoutFieldChange} />
                </div>
              </div>
            </div>

            <div className="form-compact-group">
              <h4 className="group-title">Pricing</h4>
              <div className="field-group">
                <label>Price mode</label>
                <select name="priceMode" value={form.priceMode} onChange={onCheckoutFieldChange}>
                  <option value="fixed">Fixed amount</option>
                  <option value="variable">Optional variable amount</option>
                </select>
              </div>

              {form.priceMode === 'fixed' ? (
                <div className="field-group">
                  <label>Amount (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    name="fixedAmount"
                    value={form.fixedAmount}
                    onChange={onCheckoutFieldChange}
                  />
                </div>
              ) : (
                <>
                  <div className="field-group">
                    <label>Minimum Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      name="variableMin"
                      value={form.variableMin}
                      onChange={onCheckoutFieldChange}
                    />
                  </div>
                  <div className="field-group">
                    <label>Maximum Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      name="variableMax"
                      value={form.variableMax}
                      onChange={onCheckoutFieldChange}
                    />
                  </div>
                </>
              )}

              <div className="field-group">
                <label>Settlement token</label>
                <select name="settlementAsset" value={form.settlementAsset} onChange={onCheckoutFieldChange}>
                  <option value="usdc">USDC</option>
                  <option value="usdt">USDT</option>
                  <option value="eth">ETH</option>
                </select>
              </div>
            </div>

            <div className="form-compact-group">
              <h4 className="group-title">Payment Methods</h4>
              <div className="checkbox-grid">
                {PAYMENT_METHODS.map((method) => (
                  <label key={method} className="label-inline">
                    <input
                      type="checkbox"
                      value={method}
                      checked={form.acceptedPaymentMethods.includes(method)}
                      onChange={onCheckoutFieldChange}
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-compact-group">
              <h4 className="group-title">HOT Pay settings</h4>
              <div className="field-group">
                <label>HOT PAY item ID (optional)</label>
                <input
                  name="hotpayItemId"
                  value={form.hotpayItemId}
                  onChange={onCheckoutFieldChange}
                  placeholder="Paste HOT Pay item_id for hosted settlement"
                />
              </div>

              <div className="field-group">
                <label>HOT PAY memo prefix (optional)</label>
                <input
                  name="memoPrefix"
                  value={form.memoPrefix}
                  onChange={onCheckoutFieldChange}
                  placeholder="order"
                />
              </div>
            </div>

            <div className="form-compact-group">
              <h4 className="group-title">Advanced settings</h4>
              <div className="field-group">
                <label>Redirect URL</label>
                <input
                  name="redirectUrl"
                  value={form.redirectUrl}
                  onChange={onCheckoutFieldChange}
                  placeholder="https://example.com/thank-you"
                />
              </div>
              <div className="field-group">
                <label>Webhook URL</label>
                <input
                  name="webhookUrl"
                  value={form.webhookUrl}
                  onChange={onCheckoutFieldChange}
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div className="field-group">
                <label>Metadata (JSON)</label>
                <input name="metadataJson" value={form.metadataJson} onChange={onCheckoutFieldChange} />
              </div>
            </div>

            <div className="action-row dashboard-actions">
              <button className="rainbow-btn" onClick={onSaveCheckout}>
                Update Checkout
              </button>
              <button onClick={onResetForm}>Reset</button>
            </div>

            {copyStatus.startsWith('checkout') ? <p className="status-card">Checkout saved.</p> : null}
          </section>

          <section className="panel">
            <h3>Checkout Links</h3>
            <div className="checkout-link-list">
              {checkouts.length === 0 ? (
                <div className="status-card">No checkouts yet. Create one using the left form.</div>
              ) : (
                checkouts.map((item) => {
                  const links = getCheckoutLinks(item);
                  const pricing =
                    item.priceMode === 'fixed'
                      ? `Fixed ${formatAmount(item.fixedAmount || 0)}`
                      : `Between ${formatAmount(item.variableMin || 0)} and ${formatAmount(item.variableMax || 0)}`;
                  const methods = (item.acceptedPaymentMethods || []).join(', ') || 'ETH';
                  const settlement = item.settlementAsset?.toUpperCase() || 'USDC';
                  const statusClass = item.status === 'active' ? 'ok' : 'warn';
                  const linkCopied = copyStatus === `app:${item.id}`;
                  const hotpayCopied = copyStatus === `hotpay:${item.id}`;

                  return (
                    <article className="panel-mini checkout-card" key={item.id}>
                      <header>
                        <div>
                          <strong>{item.name || 'Unnamed checkout'}</strong>
                          <p className="meta">{item.description || 'No description'}</p>
                        </div>
                        <span className={`status-pill ${statusClass}`}>{item.status || 'inactive'}</span>
                      </header>

                      <div className="checkout-meta-list">
                        <p>
                          <span>Pricing:</span> {pricing}
                        </p>
                        <p>
                          <span>Methods:</span> {methods}
                        </p>
                        <p>
                          <span>Settlement:</span> {settlement}
                        </p>
                      </div>

                      <div className="action-grid">
                        <button onClick={() => copyWithStatus(`app:${item.id}`, links.app)} className="small">
                          {linkCopied ? 'Copied' : 'Copy Link'}
                        </button>

                        <button
                          className="small"
                          onClick={() => copyWithStatus(`hotpay:${item.id}`, links.hotpay)}
                          disabled={!item.hotpayItemId}
                        >
                          {hotpayCopied ? 'Copied' : 'Copy HOT Pay'}
                        </button>

                        <button
                          className="small"
                          onClick={() => window.open(`${QR_BASE}${encodeURIComponent(links.app)}`, '_blank', 'noopener,noreferrer')}
                        >
                          QR Code
                        </button>

                        <button onClick={() => onEditCheckout(item)} className="small">
                          Edit
                        </button>

                        <button onClick={() => onToggleStatus(item.id, item.status === 'active' ? 'inactive' : 'active')}>
                          {item.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>

                        <button onClick={() => onDeleteCheckout(item.id)} className="small">
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="panel dashboard-section">
        <h2 className="section-title">TRANSACTION MONITORING</h2>

        <div className="field-group filter-row">
          <label>Filter by checkout</label>
          <select value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value)}>
            <option value="all">All checkout pages</option>
            {checkouts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.id})
              </option>
            ))}
          </select>
        </div>

        {filteredTransactions.length === 0 ? (
          <p className="status-card">No transactions yet — share your checkout link to start accepting payments.</p>
        ) : (
          <div className="table-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Settlement</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 100).map((tx) => {
                  const statusClass =
                    tx.status === 'confirmed' || tx.status === 'success'
                      ? 'ok'
                      : tx.status === 'failed'
                        ? 'bad'
                        : 'warn';
                  const checkout = checkouts.find((item) => item.id === tx.checkoutId);

                  return (
                    <tr key={tx.id}>
                      <td>{toTxnTime(tx.createdAt)}</td>
                      <td>{formatRouteAmount(tx.amountUsd)}</td>
                      <td>{tx.paymentMethod || 'N/A'}</td>
                      <td>
                        <span className={`status-pill ${statusClass}`}>{tx.status}</span>
                      </td>
                      <td>{(tx.route?.settlementSymbol || checkout?.settlementAsset || 'USDC').toString().toUpperCase()}</td>
                      <td>{tx.txHash || 'pending'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
