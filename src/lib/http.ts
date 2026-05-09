/**
 * fetch wrapper that surfaces server messages to the toast system.
 *
 * Both runtimes return JSON for AJAX endpoints when the request advertises
 * `Accept: application/json`. The .NET runtime uses an `X-Cms-Toast` response
 * header for one-shot status messages — we honour that on both sides.
 */

import { showToast, type ToastKind } from '../enhancers/toasts.js';

export interface CmsFetchInit extends RequestInit {
  toastErrors?: boolean;
  toastSuccess?: string | false;
}

export async function cmsFetch(input: RequestInfo | URL, init: CmsFetchInit = {}): Promise<Response> {
  const { toastErrors = true, toastSuccess = false, headers, ...rest } = init;

  const merged: RequestInit = {
    credentials: 'same-origin',
    ...rest,
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(headers ?? {}),
    },
  };

  let res: Response;
  try {
    res = await fetch(input, merged);
  } catch (e) {
    if (toastErrors) showToast({ kind: 'danger', title: 'Network error', message: String(e) });
    throw e;
  }

  // Surface server-provided toast messages on both runtimes.
  const tHeader = res.headers.get('X-Cms-Toast');
  if (tHeader) {
    try {
      const parsed = JSON.parse(tHeader) as { kind?: ToastKind; title?: string; message?: string };
      showToast({
        kind: parsed.kind ?? (res.ok ? 'info' : 'danger'),
        title: parsed.title,
        message: parsed.message ?? '',
      });
    } catch {
      showToast({ kind: res.ok ? 'info' : 'danger', message: tHeader });
    }
  }

  if (!res.ok && toastErrors && !tHeader) {
    showToast({
      kind: 'danger',
      title: `${res.status} ${res.statusText || 'Error'}`,
      message: await peekErrorBody(res),
    });
  } else if (res.ok && toastSuccess) {
    showToast({ kind: 'success', message: toastSuccess });
  }

  return res;
}

async function peekErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.clone().text();
    if (!text) return '';
    if (text.length > 200) return text.slice(0, 200) + '…';
    return text;
  } catch {
    return '';
  }
}
