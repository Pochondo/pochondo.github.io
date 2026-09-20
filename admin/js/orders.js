/* The orders screen: read incoming orders and move them along. */
window.Orders = (function () {
  'use strict';

  const A = window.Admin;
  const STATUSES = ['new', 'confirmed', 'shipped', 'done', 'cancelled'];
  const SELECT = 'id,created_at,customer,phone,address,note,total,status,' +
                 'order_items(piece_name,unit_price,quantity)';

  function when(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  function itemLines(items) {
    if (!Array.isArray(items) || !items.length) return '';
    return '<ul class="order-items">' + items.map((it) =>
      '<li>' + A.escapeHtml(it.piece_name) + ' &times; ' + Number(it.quantity) +
      ' — ' + A.taka(Number(it.unit_price) * Number(it.quantity)) + '</li>'
    ).join('') + '</ul>';
  }

  function card(order) {
    const options = STATUSES.map((s) =>
      '<option value="' + s + '"' + (s === order.status ? ' selected' : '') + '>' + s + '</option>'
    ).join('');

    return '<li class="order-card">' +
      '<div class="order-head">' +
        '<strong>' + A.escapeHtml(order.customer) + '</strong>' +
        '<span class="order-total">' + A.taka(order.total) + '</span>' +
      '</div>' +
      '<div class="order-meta">' + when(order.created_at) + ' · ' +
        '<a href="tel:' + A.escapeHtml(order.phone) + '">' + A.escapeHtml(order.phone) + '</a>' +
      '</div>' +
      itemLines(order.order_items) +
      (order.address ? '<div class="order-meta">' + A.escapeHtml(order.address) + '</div>' : '') +
      (order.note ? '<div class="order-meta">“' + A.escapeHtml(order.note) + '”</div>' : '') +
      '<select data-id="' + order.id + '" aria-label="Order status">' + options + '</select>' +
    '</li>';
  }

  async function setStatus(id, status, select) {
    select.disabled = true;
    try {
      const { error } = await A.client.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      A.setMessage(A.$('#orders-status'), A.explain(error), true);
    } finally {
      select.disabled = false;
    }
  }

  async function load() {
    const status = A.$('#orders-status');
    try {
      const { data, error } = await A.client
        .from('orders').select(SELECT).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;

      const orders = data || [];
      A.$('#order-list').innerHTML = orders.map(card).join('');
      A.setMessage(status, orders.length ? '' : 'No orders yet.');

      A.$('#order-list').querySelectorAll('select').forEach((select) => {
        select.addEventListener('change', () => setStatus(select.dataset.id, select.value, select));
      });
    } catch (error) {
      A.setMessage(status, A.explain(error), true);
    }
  }

  return { load };
}());
