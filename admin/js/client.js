/* Supabase client, sign in, and the shared helpers the admin screens use.
 *
 * The anon key in config.js is public and read-only by itself. Everything
 * below only works because signing in swaps it for a session belonging to a
 * row in public.admins; the database checks that on every statement.
 */
window.Admin = (function () {
  'use strict';

  const cfg = window.SUPABASE || {};
  const client = window.supabase.createClient(cfg.url, cfg.anonKey);

  const $ = (sel) => document.querySelector(sel);

  const screens = {
    login: $('#screen-login'),
    shop:  $('#screen-shop')
  };

  function show(name) {
    screens.login.hidden = name !== 'login';
    screens.shop.hidden  = name !== 'shop';
  }

  function setMessage(el, text, isError) {
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    el.className = isError ? 'error' : 'status';
  }

  /* Postgres errors are blunt. Say something a person can act on. */
  function explain(error) {
    if (!error) return 'Something went wrong.';
    const msg = String(error.message || error);
    if (/Invalid login credentials/i.test(msg)) return 'That email and password do not match.';
    if (/duplicate key|already exists/i.test(msg)) return 'A piece with that short id already exists.';
    if (/row-level security|permission denied/i.test(msg)) {
      return 'This account is not an admin. Add it to the admins table.';
    }
    if (/violates check constraint .*shape/i.test(msg)) return 'Shape must be one of the six listed.';
    if (/Failed to fetch|NetworkError/i.test(msg)) return 'Cannot reach the database. Check your connection.';
    return msg;
  }

  function taka(n) {
    const v = Number(n);
    return '৳' + (Number.isFinite(v) ? v.toLocaleString('en-US') : '0');
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  async function currentAdmin() {
    const { data } = await client.auth.getSession();
    return data && data.session ? data.session.user : null;
  }

  async function signIn(email, password) {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await client.auth.signOut();
    window.location.reload();
  }

  /* Supabase mails a one-time link back to reset.html, where the new
     password is set. The reply is deliberately identical whether or not the
     address has an account, so this cannot be used to discover who does. */
  async function sendReset(email) {
    const redirectTo = new URL('reset.html', window.location.href).href;
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  function bindForgot() {
    const button = $('#forgot');
    const note = $('#login-note');
    const err = $('#login-error');

    button.addEventListener('click', async () => {
      const email = $('#email').value.trim();
      setMessage(err, '', true);

      if (!email) {
        setMessage(err, 'Type your email above first, then tap this.', true);
        $('#email').focus();
        return;
      }

      button.disabled = true;
      setMessage(note, 'Sending\u2026');
      try {
        await sendReset(email);
        setMessage(note, 'If that address has an account, a reset link is on its way. ' +
                         'It expires in an hour.');
      } catch (error) {
        setMessage(err, explain(error), true);
        setMessage(note, '');
      } finally {
        button.disabled = false;
      }
    });
  }

  /* ------------------------------------------------------------ wiring */
  async function enter(user) {
    $('#who').textContent = user.email || '';
    $('#sign-out').hidden = false;
    show('shop');
    await Promise.all([window.Pieces.load(), window.Orders.load()]);
  }

  function bindTabs() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-on', t === tab));
        $('#tab-pieces').hidden = tab.dataset.tab !== 'pieces';
        $('#tab-orders').hidden = tab.dataset.tab !== 'orders';
      });
    });
  }

  function bindLogin() {
    const form = $('#login-form');
    const err = $('#login-error');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      setMessage(err, '', true);
      try {
        await signIn($('#email').value.trim(), $('#password').value);
        const user = await currentAdmin();
        if (user) await enter(user);
      } catch (error) {
        setMessage(err, explain(error), true);
      } finally {
        button.disabled = false;
      }
    });
  }

  async function start() {
    bindTabs();
    bindLogin();
    bindForgot();
    $('#sign-out').addEventListener('click', signOut);

    const user = await currentAdmin();
    if (user) {
      await enter(user);
    } else {
      show('login');
    }
  }

  document.addEventListener('DOMContentLoaded', start);

  return { client, $, setMessage, explain, taka, escapeHtml };
}());
