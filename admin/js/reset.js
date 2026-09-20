/* Sets a new password after arriving from a reset email.
 *
 * The link carries a one-time recovery token in the URL fragment. The
 * Supabase client reads it and opens a short-lived session that may do
 * exactly one useful thing: change this account's password.
 */
(function () {
  'use strict';

  /* Read the fragment first: creating the client consumes and clears it. */
  const arrivedFromEmail = /type=recovery/.test(window.location.hash || '');

  const cfg = window.SUPABASE || {};
  const client = window.supabase.createClient(cfg.url, cfg.anonKey);

  const $ = (sel) => document.querySelector(sel);
  const form = $('#reset-form');
  const status = $('#reset-status');
  const error = $('#reset-error');

  function say(el, text, hide) {
    el.textContent = text || '';
    el.hidden = hide === undefined ? !text : hide;
  }

  function explain(err) {
    const msg = String((err && err.message) || err || '');
    if (/expired|invalid/i.test(msg)) {
      return 'That link has expired. Request a new one from the sign-in page.';
    }
    if (/should be at least|password/i.test(msg) && /characters/i.test(msg)) {
      return 'That password is too short.';
    }
    if (/same as the old|different from the old/i.test(msg)) {
      return 'Choose a password different from the current one.';
    }
    return msg || 'Could not set the password.';
  }

  async function onSubmit(e) {
    e.preventDefault();
    const button = form.querySelector('button');
    const pw1 = $('#pw1').value;
    const pw2 = $('#pw2').value;

    say(error, '', true);

    if (pw1 !== pw2) return say(error, 'The two passwords do not match.');
    if (pw1.length < 8) return say(error, 'Use at least 8 characters.');

    button.disabled = true;
    try {
      const { error: err } = await client.auth.updateUser({ password: pw1 });
      if (err) throw err;

      form.hidden = true;
      say(status, 'Password changed. You can sign in with it now.');
      $('#reset-done').hidden = false;
      await client.auth.signOut();
    } catch (err) {
      say(error, explain(err));
    } finally {
      button.disabled = false;
    }
  }

  function reveal(message) {
    say(status, message || '', !message);
    form.hidden = false;
  }

  async function start() {
    client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') reveal('');
    });

    if (arrivedFromEmail) {
      /* The client needs a moment to turn the fragment into a session. */
      setTimeout(async () => {
        const { data } = await client.auth.getSession();
        if (data && data.session) return reveal('');
        say(status, 'That link has expired or has already been used. ' +
                    'Request a new one from the sign-in page.');
        $('#reset-done').hidden = false;
      }, 1200);
      return;
    }

    const { data } = await client.auth.getSession();
    if (data && data.session) {
      reveal('You are signed in, so you can change your password here.');
      return;
    }

    say(status, 'This page needs a reset link from your email. ' +
                'Open the sign-in page and tap Forgot password.');
    $('#reset-done').hidden = false;
  }

  document.addEventListener('DOMContentLoaded', start);
}());
